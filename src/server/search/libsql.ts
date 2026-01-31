import type { Client } from "@libsql/client";
import type { Patch, PatchHandler, SearchResult } from "@fartlabs/search-store";
import { skolemizeQuad } from "@fartlabs/search-store";
import type { Embeddings } from "#/server/embeddings/embeddings.ts";

/**
 * LibsqlSearchResult is a result from a search query.
 */
export type LibsqlSearchResult = SearchResult<LibsqlSearchResultItem>;

/**
 * LibsqlSearchResultItem is a result from a search query.
 */
/**
 * LibsqlSearchResultItem is a result from a search query.
 */
export interface LibsqlSearchResultItem {
  /**
   * tenantId is the tenant identifier for this result.
   */
  tenantId: string;

  /**
   * worldId is the world identifier for this result.
   */
  worldId: string;

  /**
   * subject is the subject node (IRI) of the result.
   */
  subject: string;

  /**
   * predicate is the predicate node (IRI) of the result.
   */
  predicate: string;

  /**
   * object is the object node (string literal) of the result.
   */
  object: string;
}

/**
 * LibsqlSearchStoreManagerOptions are options for the LibsqlSearchStoreManager.
 */
export interface LibsqlSearchStoreManagerOptions {
  /**
   * client is the Libsql client to use for database operations.
   */
  client: Client;

  /**
   * embeddings are options for generating vector embeddings.
   */
  embeddings: Embeddings;
}

/**
 * LibsqlSearchStoreManager implements search across all tenants and worlds using a single Libsql table.
 * Logic isolation is enforced via tenantId and worldId columns.
 *
 * TODO: Consider hash-based siloing (e.g. search_documents_silo_N) if the global table
 * grows too large, to keep index sizes manageable while avoiding per-tenant table limits.
 */
export class LibsqlSearchStoreManager {
  public constructor(
    private readonly options: LibsqlSearchStoreManagerOptions,
  ) {}

  /**
   * createTablesIfNotExists creates the necessary tables and indexes if they don't exist.
   */
  public async createTablesIfNotExists(): Promise<void> {
    await this.options.client.batch([
      // Main data table with vector column and multi-tenant identifiers.
      {
        sql: `CREATE TABLE IF NOT EXISTS search_documents (
          id TEXT PRIMARY KEY,
          tenantId TEXT NOT NULL,
          worldId TEXT NOT NULL,
          subject TEXT NOT NULL,
          predicate TEXT NOT NULL,
          object TEXT NOT NULL,
          embedding F32_BLOB(${this.options.embeddings.dimensions}),
          UNIQUE(tenantId, worldId, subject, predicate, object)
        )`,
      },
      // TODO: Monitor for native metadata filtering support in Libsql/Turso (sqlite-vec).
      // Once available, use PARTITION KEY on tenantId to replace internal recall buffer hacks.

      // Index on tenantId and worldId for efficient lookups/filtering.
      {
        sql: `CREATE INDEX IF NOT EXISTS search_documents_access_idx 
              ON search_documents(tenantId, worldId)`,
      },

      // Vector index.
      {
        sql: `CREATE INDEX IF NOT EXISTS search_idx 
              ON search_documents(libsql_vector_idx(embedding))`,
      },

      // FTS virtual table.
      {
        sql: `CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
          object,
          content='search_documents',
          content_rowid='rowid'
        )`,
      },

      // Triggers to keep FTS in sync.
      {
        sql: `CREATE TRIGGER IF NOT EXISTS search_documents_ai 
              AFTER INSERT ON search_documents BEGIN
          INSERT INTO search_fts(rowid, object) VALUES (new.rowid, new.object);
        END`,
      },
      {
        sql: `CREATE TRIGGER IF NOT EXISTS search_documents_ad 
              AFTER DELETE ON search_documents BEGIN
          INSERT INTO search_fts(search_fts, rowid, object) 
          VALUES('delete', old.rowid, old.object);
        END`,
      },
      {
        sql: `CREATE TRIGGER IF NOT EXISTS search_documents_au 
              AFTER UPDATE ON search_documents BEGIN
          INSERT INTO search_fts(search_fts, rowid, object) 
          VALUES('delete', old.rowid, old.object);
          INSERT INTO search_fts(rowid, object) VALUES (new.rowid, new.object);
        END`,
      },
    ], "write");
  }

  /**
   * deleteTenant deletes all documents for a specific tenant.
   */
  public async deleteTenant(tenantId: string): Promise<void> {
    await this.options.client.execute({
      sql: `DELETE FROM search_documents WHERE tenantId = ?`,
      args: [tenantId],
    });
  }

  /**
   * deleteWorld deletes all documents for a specific world within a tenant.
   */
  public async deleteWorld(tenantId: string, worldId: string): Promise<void> {
    await this.options.client.execute({
      sql: `DELETE FROM search_documents WHERE tenantId = ? AND worldId = ?`,
      args: [tenantId, worldId],
    });
  }

  /**
   * patch patches documents for a specific world.
   */
  public async patch(
    tenantId: string,
    worldId: string,
    patches: Patch[],
  ): Promise<void> {
    for (const { insertions, deletions } of patches) {
      if (deletions.length > 0) {
        const deleteStmts = await Promise.all(
          deletions.map(async (quad) => ({
            sql:
              `DELETE FROM search_documents WHERE id = ? AND tenantId = ? AND worldId = ?`,
            args: [await skolemizeQuad(quad), tenantId, worldId],
          })),
        );
        await this.options.client.batch(deleteStmts, "write");
      }

      if (insertions.length > 0) {
        const insertStmts = await Promise.all(
          insertions.map(async (quad) => ({
            sql: `INSERT OR REPLACE INTO search_documents 
                  (id, tenantId, worldId, subject, predicate, object, embedding) 
                  VALUES (?, ?, ?, ?, ?, ?, vector32(?))`,
            args: [
              await skolemizeQuad(quad),
              tenantId,
              worldId,
              quad.subject.value,
              quad.predicate.value,
              quad.object.value,
              JSON.stringify(
                await this.options.embeddings.embed(quad.object.value),
              ),
            ],
          })),
        );
        await this.options.client.batch(insertStmts, "write");
      }
    }
  }

  /**
   * search searches documents across specified worlds of a tenant.
   *
   * @param query - The search query text
   * @param options.tenantId - Required tenant ID for isolation
   * @param options.worldIds - Optional array of world IDs to filter results
   * @param options.limit - Maximum number of results (default: 10)
   * @param options.weightFts - Weight for FTS results in RRF (default: 1.0)
   * @param options.weightVec - Weight for vector results in RRF (default: 1.0)
   * @param options.rrfK - RRF constant k (default: 60)
   * @param options.recallBuffer - Multiplier for internal vector search limit (default: 10)
   */
  public async search(
    query: string,
    options: {
      tenantId: string;
      worldIds?: string[];
      limit?: number;
      weightFts?: number;
      weightVec?: number;
      rrfK?: number;
      recallBuffer?: number;
    },
  ): Promise<LibsqlSearchResult[]> {
    const {
      tenantId,
      worldIds,
      limit = 10,
      weightFts = 1.0,
      weightVec = 1.0,
      rrfK = 60,
      recallBuffer = 10,
    } = options;
    const embedding = await this.options.embeddings.embed(query);
    const vectorString = JSON.stringify(embedding);

    // Use a larger internal limit for vector search to improve recall
    // This helps ensure tenant-specific results aren't filtered out by global ranking
    // TODO: Implement tiered recall buffer multiplier based on total document count per tenant
    // or global skew to maintain high recall for smaller tenants.
    const internalVectorLimit = limit * recallBuffer;

    // Build base WHERE clause for tenant isolation.
    let accessFilter = "WHERE search_documents.tenantId = ?";
    const args: (string | number)[] = [
      vectorString,
      internalVectorLimit,
      query,
      limit,
      tenantId,
    ];

    if (worldIds && worldIds.length > 0) {
      const placeholders = worldIds.map(() => "?").join(", ");
      accessFilter += ` AND search_documents.worldId IN (${placeholders})`;
      args.push(...worldIds);
    }
    args.push(limit); // final LIMIT

    const result = await this.options.client.execute({
      sql: `
      WITH vec_matches AS (
        SELECT
          id as rowid,
          row_number() OVER (PARTITION BY NULL) as rank_number
        FROM vector_top_k('search_idx', vector32(?), ?)
      ),
      fts_matches AS (
        SELECT
          rowid,
          row_number() OVER (ORDER BY rank) as rank_number,
          rank as score
        FROM search_fts
        WHERE search_fts MATCH ?
        LIMIT ?
      ),
      final AS (
        SELECT
          search_documents.tenantId,
          search_documents.worldId,
          search_documents.subject,
          search_documents.predicate,
          search_documents.object,
          vec_matches.rank_number as vec_rank,
          fts_matches.rank_number as fts_rank,
          (
            COALESCE(1.0 / (${rrfK} + fts_matches.rank_number), 0.0) * ${weightFts} +
            COALESCE(1.0 / (${rrfK} + vec_matches.rank_number), 0.0) * ${weightVec}
          ) as combined_rank
        FROM fts_matches
        FULL OUTER JOIN vec_matches ON vec_matches.rowid = fts_matches.rowid
        JOIN search_documents ON search_documents.rowid = COALESCE(fts_matches.rowid, vec_matches.rowid)
        ${accessFilter}
        ORDER BY combined_rank DESC
        LIMIT ?
      )
      SELECT * FROM final
    `,
      args,
    });

    return result.rows.map((row) => {
      if (
        typeof row.combined_rank !== "number" ||
        typeof row.tenantId !== "string" ||
        typeof row.worldId !== "string" ||
        typeof row.subject !== "string" ||
        typeof row.predicate !== "string" ||
        typeof row.object !== "string"
      ) {
        throw new Error("Invalid search result");
      }

      return {
        score: row.combined_rank,
        value: {
          tenantId: row.tenantId,
          worldId: row.worldId,
          subject: row.subject,
          predicate: row.predicate,
          object: row.object,
        },
      };
    });
  }
}

/**
 * LibsqlPatchHandler implements RDF patching for a specific world.
 */
export class LibsqlPatchHandler implements PatchHandler {
  public constructor(
    private readonly options: {
      manager: LibsqlSearchStoreManager;
      tenantId: string;
      worldId: string;
    },
  ) {}

  public async patch(patches: Patch[]): Promise<void> {
    await this.options.manager.patch(
      this.options.tenantId,
      this.options.worldId,
      patches,
    );
  }
}
