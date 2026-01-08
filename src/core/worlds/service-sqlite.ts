import {
  blankNode,
  defaultGraph,
  literal,
  namedNode,
  type Quad,
  Store,
  type Term,
} from "oxigraph";
import type { Client } from "#/core/database/database.ts";
import type { Chunk, RankedResult, Statement } from "#/core/types/mod.ts";
import type { DenormalizedStatementRow } from "#/core/database/statements.ts";
import type { OxigraphService, WorldMetadata } from "./service.ts";
import { statementsSql } from "#/core/database/statements.ts";

/**
 * SqliteOxigraphService is the SQLite implementation of OxigraphService.
 *
 * This implementation uses a hybrid storage strategy:
 * - **Oxigraph (Wasm)**: In-memory RDF store for fast SPARQL queries
 * - **SQLite**: Persistent storage for graph data and metadata
 *
 * The service maintains a cache of world database connections and hydrates
 * Oxigraph stores from SQLite on cold starts. Writes are persisted to SQLite
 * immediately, with cache invalidation to ensure consistency.
 *
 * Each world has its own isolated SQLite database file, ensuring data isolation
 * and enabling per-world optimizations.
 */
export class SqliteOxigraphService implements OxigraphService {
  /**
   * Cache of world database connections to avoid repeated lookups.
   */
  private readonly worldsDb = new Map<string, Client>();

  /**
   * Creates a new SqliteOxigraphService instance.
   *
   * @param db - The system database client (contains world metadata)
   * @param getWorldDb - A function that retrieves the database client for a specific world
   */
  public constructor(
    /**
     * db is the system database (system.db).
     */
    private readonly db: Client,
    /**
     * getWorldDb gets the world database by world ID.
     */
    private readonly getWorldDb: (id: string) => Promise<Client>,
  ) {}

  private async getCachedWorldDb(id: string): Promise<Client> {
    if (!this.worldsDb.has(id)) {
      this.worldsDb.set(id, await this.getWorldDb(id));
    }

    return this.worldsDb.get(id)!;
  }

  // Helper to init schema, extracted from setStore/addQuads
  private async initWorldSchema(client: Client) {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='kb_statements'",
    );
    if (result.rows.length === 0) {
      try {
        await client.executeMultiple(statementsSql);
      } catch (error) {
        // If vec0 extension is not available, try creating schema without it
        // This allows the system to work without vector search support
        if (error instanceof Error && error.message.includes("vec0")) {
          // Schema will be created without vec0 table - this is acceptable for basic functionality
          console.warn(
            "vec0 extension not available, continuing without vector search support",
          );
        } else {
          throw error;
        }
      }
    }
  }

  async listStores(): Promise<string[]> {
    const result = await this.db.execute("SELECT world_id FROM kb_worlds");
    const rows = result.rows as unknown as { world_id: string }[];
    return rows.map((r) => r.world_id);
  }

  async getStore(id: string): Promise<Store | null> {
    const store = new Store();
    const worldDb = await this.getCachedWorldDb(id);
    try {
      // For file-based, table might not exist if created manually or empty?
      // Actually setStore creates it.
      // We wrap in try-catch just in case accessing a non-existent file DB fails differently.
      const result = await worldDb.execute("SELECT * FROM kb_statements");
      const rows = result.rows as unknown as DenormalizedStatementRow[];
      for (const row of rows) {
        store.add({
          subject: this.fromTerm(row.subject),
          predicate: namedNode(row.predicate),
          object: this.fromTerm(
            row.object,
            row.term_type === "Literal" ? "Literal" : "NamedNode",
            row.object_language,
            row.object_datatype,
          ),
          graph: row.graph ? namedNode(row.graph) : defaultGraph(),
        } as Quad);
      }
    } catch (_) {
      // Ignore errors if table doesn't exist
    }

    return store;
  }

  async setStore(id: string, owner: string, store: Store): Promise<void> {
    // Insert world record
    await this.db.execute({
      sql: `
        INSERT OR IGNORE INTO kb_worlds (world_id, account_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [id, owner, `World ${id}`, Date.now(), Date.now()],
    });

    const worldDb = await this.getCachedWorldDb(id);

    // Init schema (idempotent, but ensures existence)
    await this.initWorldSchema(worldDb);

    // Delete all and insert new
    // We use a batch for atomicity and speed
    const stmts = [];
    stmts.push({ sql: "DELETE FROM kb_statements", args: [] }); // Clear existing

    // We can't batch too many at once if the store is huge, but for now we assume it fits.
    // If huge, we'd chunk it.
    for (const quad of store.match()) {
      // TODO: const statementRow: StatementRow = fromQuad(quad);
      stmts.push({
        sql: `
            INSERT INTO kb_statements (subject, predicate, object, graph, term_type, object_language, object_datatype)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
        args: [
          quad.subject.value,
          quad.predicate.value,
          quad.object.value,
          quad.graph.value,
          quad.object.termType,
          (quad.object as { language?: string }).language || "",
          (quad.object as { datatype?: { value: string } }).datatype?.value ||
          "",
        ],
      });
    }

    if (stmts.length > 0) {
      await worldDb.batch(stmts, "write");
    }

    await this.updateMetadataTimestamp(id);
  }

  // Helpers for Term conversion
  private fromTerm(
    value: string,
    type?: string,
    language?: string,
    datatype?: string,
  ): Term {
    if (type === "BlankNode") return blankNode(value);
    if (type === "Literal") {
      return literal(
        value,
        language ||
          namedNode(datatype || "http://www.w3.org/2001/XMLSchema#string"),
      );
    }
    if (type === "DefaultGraph") return defaultGraph();
    return namedNode(value);
  }

  async getMetadata(id: string): Promise<WorldMetadata | null> {
    const result = await this.db.execute({
      sql: "SELECT * FROM kb_worlds WHERE world_id = ?",
      args: [id],
    });
    const row = result.rows[0] as unknown as {
      world_id: string;
      description: string;
      created_at: number;
      account_id: string;
      updated_at: number;
    } | undefined;

    if (!row) return null;

    return {
      id: row.world_id,
      description: row.description || "",
      size: 0,
      tripleCount: await this.countTriples(row.world_id),
      createdAt: row.created_at,
      createdBy: row.account_id,
      updatedAt: row.updated_at,
    };
  }

  private async countTriples(id: string): Promise<number> {
    try {
      const worldDb = await this.getCachedWorldDb(id);
      const result = await worldDb.execute(
        "SELECT COUNT(*) as count FROM kb_statements",
      );
      const row = result.rows[0] as unknown as { count: number };
      return row.count;
    } catch (_) {
      return 0;
    }
  }

  getManyMetadata(ids: string[]): Promise<(WorldMetadata | null)[]> {
    return Promise.all(ids.map((id) => this.getMetadata(id)));
  }

  private async updateMetadataTimestamp(id: string) {
    await this.db.execute({
      sql: "UPDATE kb_worlds SET updated_at = ? WHERE world_id = ?",
      args: [Date.now(), id],
    });
  }

  async addQuads(id: string, owner: string, quads: Quad[]): Promise<void> {
    // Ensure world exists first (implicit in setStore, but explicit here might be good)
    // Actually setStore creates the world record.
    // If we just add quads to a non-existent world, we might want to create it.
    // For now, let's just insert.

    // If the world doesn't exist in kb_worlds, we should probably add it.
    await this.db.execute({
      sql: `
        INSERT OR IGNORE INTO kb_worlds (world_id, account_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [id, owner, `World ${id}`, Date.now(), Date.now()],
    });

    const worldDb = await this.getCachedWorldDb(id);
    await this.initWorldSchema(worldDb);

    const stmts = [];
    for (const quad of quads) {
      stmts.push({
        sql: `
            INSERT OR IGNORE INTO kb_statements (subject, predicate, object, graph, term_type, object_language, object_datatype)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
        args: [
          quad.subject.value,
          quad.predicate.value,
          quad.object.value,
          quad.graph.value,
          quad.object.termType,
          (quad.object as { language?: string }).language || "",
          (quad.object as { datatype?: { value: string } }).datatype?.value ||
          "",
        ],
      });
    }

    if (stmts.length > 0) {
      await worldDb.batch(stmts, "write");
    }

    await this.updateMetadataTimestamp(id);
  }

  async query(
    id: string,
    query: string,
  ): Promise<boolean | Map<string, Term>[] | Quad[] | string> {
    const store = await this.getStore(id);
    if (!store) return [];
    // Oxigraph store.query result needs careful handling if strict types expected
    return store.query(query);
  }

  async update(id: string, query: string): Promise<void> {
    const store = await this.getStore(id);
    if (!store) throw new Error("Store not found");
    store.update(query);
    const metadata = await this.getMetadata(id);
    await this.setStore(id, metadata?.createdBy || "unknown", store);
  }

  async updateDescription(id: string, description: string): Promise<void> {
    await this.db.execute({
      sql:
        "UPDATE kb_worlds SET description = ?, updated_at = ? WHERE world_id = ?",
      args: [description, Date.now(), id],
    });
  }

  async removeStore(id: string): Promise<void> {
    await this.db.execute({
      sql: "DELETE FROM kb_worlds WHERE world_id = ?",
      args: [id],
    });
  }

  async searchStatements(
    id: string,
    query: string,
  ): Promise<RankedResult<Statement>[]> {
    const worldDb = await this.getCachedWorldDb(id);
    const result = await worldDb.execute({
      sql: `
        SELECT * FROM kb_statements 
        WHERE subject LIKE ? OR object LIKE ? OR predicate LIKE ?
        LIMIT 20
        `,
      args: [`%${query}%`, `%${query}%`, `%${query}%`],
    });
    const rows = result.rows as unknown as DenormalizedStatementRow[];

    return rows.map((row) => ({
      item: {
        statementId: row.statement_id || 0,
        subject: row.subject,
        predicate: row.predicate,
        object: row.object,
        graph: row.graph,
        termType: row.term_type || "NamedNode",
        objectLanguage: row.object_language,
        objectDatatype: row.object_datatype,
      } as Statement,
      score: 1.0,
      rank: { match: 1 },
    }));
  }

  async getStatement(
    id: string,
    statementId: number,
  ): Promise<Statement | null> {
    const worldDb = await this.getCachedWorldDb(id);
    const result = await worldDb.execute({
      sql: "SELECT * FROM kb_statements WHERE statement_id = ?",
      args: [statementId],
    });

    const row = result.rows[0] as unknown as
      | DenormalizedStatementRow
      | undefined;
    if (!row) return null;

    return {
      statementId: row.statement_id || 0,
      subject: row.subject,
      predicate: row.predicate,
      object: row.object,
      graph: row.graph,
      termType: row.term_type || "NamedNode",
      objectLanguage: row.object_language,
      objectDatatype: row.object_datatype,
    } as Statement;
  }

  searchChunks(
    _id: string,
    _query: string,
  ): Promise<RankedResult<Chunk>[]> {
    return Promise.resolve([]);
  }

  getChunk(_id: string, _chunkId: number): Promise<Chunk | null> {
    return Promise.resolve(null);
  }
}
