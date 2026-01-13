import type { Client } from "@libsql/client";
import type { Patch, SearchResult, SearchStore } from "@fartlabs/search-store";
import { skolemizeQuad } from "@fartlabs/search-store";

// TODO: Include an rdfjs.Quad in the search result item
// TODO: Implement overlapping chunks for better context

/**
 * SearchResultItem is a result from a search query.
 */
export interface SearchResultItem {
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
 * LibsqlSearchStoreOptions are options for the LibsqlSearchStore.
 */
import type { Embeddings } from "../embeddings/embeddings.ts";

export interface LibsqlSearchStoreOptions {
  /**
   * client is the Libsql client to use for database operations.
   */
  client: Client;

  /**
   * tablePrefix is the prefix to use for the database tables.
   */
  tablePrefix: string;

  // TODO: Update embeddings to embed multiple texts at once.

  /**
   * embeddings are options for generating vector embeddings.
   */
  embeddings: Embeddings;
}

/**
 * LibsqlSearchStore implements the SearchStore interface using Libsql as the backend.
 */
export class LibsqlSearchStore implements SearchStore<SearchResultItem> {
  public constructor(private readonly options: LibsqlSearchStoreOptions) {}

  public async createTablesIfNotExists() {
    await this.options.client.batch([
      // Main data table with vector column.
      {
        sql: `CREATE TABLE IF NOT EXISTS ${this.options.tablePrefix}documents (
          id TEXT PRIMARY KEY,
          subject TEXT NOT NULL,
          predicate TEXT NOT NULL,
          object TEXT NOT NULL,
          embedding F32_BLOB(${this.options.embeddings.dimensions}),
          UNIQUE(subject, predicate, object)
        )`,
      },

      // Vector index.
      {
        sql:
          `CREATE INDEX IF NOT EXISTS ${this.options.tablePrefix}search_idx ON ${this.options.tablePrefix}documents(libsql_vector_idx(embedding))`,
      },

      // FTS virtual table.
      {
        sql:
          `CREATE VIRTUAL TABLE IF NOT EXISTS ${this.options.tablePrefix}search_fts USING fts5(
          object,
          content='${this.options.tablePrefix}documents',
          content_rowid='rowid'
        )`,
      },

      // Triggers to keep FTS in sync.
      {
        sql:
          `CREATE TRIGGER IF NOT EXISTS ${this.options.tablePrefix}documents_ai AFTER INSERT ON ${this.options.tablePrefix}documents BEGIN
          INSERT INTO ${this.options.tablePrefix}search_fts(rowid, object) VALUES (new.rowid, new.object);
        END`,
      },
      {
        sql:
          `CREATE TRIGGER IF NOT EXISTS ${this.options.tablePrefix}documents_ad AFTER DELETE ON ${this.options.tablePrefix}documents BEGIN
          INSERT INTO ${this.options.tablePrefix}search_fts(${this.options.tablePrefix}search_fts, rowid, object) VALUES('delete', old.rowid, old.object);
        END`,
      },
      {
        sql:
          `CREATE TRIGGER IF NOT EXISTS ${this.options.tablePrefix}documents_au AFTER UPDATE ON ${this.options.tablePrefix}documents BEGIN
          INSERT INTO ${this.options.tablePrefix}search_fts(${this.options.tablePrefix}search_fts, rowid, object) VALUES('delete', old.rowid, old.object);
          INSERT INTO ${this.options.tablePrefix}search_fts(rowid, object) VALUES (new.rowid, new.object);
        END`,
      },
    ], "write");
  }

  public async drop() {
    await this.options.client.batch([
      { sql: `DROP TABLE IF EXISTS ${this.options.tablePrefix}search_fts` },
      { sql: `DROP TABLE IF EXISTS ${this.options.tablePrefix}documents` },
    ], "write");
  }

  public async patch(patches: Patch[]): Promise<void> {
    for (const { insertions, deletions } of patches) {
      if (deletions.length > 0) {
        const deleteStmts = await Promise.all(
          deletions.map(async (quad) => ({
            sql:
              `DELETE FROM ${this.options.tablePrefix}documents WHERE id = ?`,
            args: [await skolemizeQuad(quad)],
          })),
        );
        await this.options.client.batch(deleteStmts, "write");
      }

      if (insertions.length > 0) {
        const insertStmts = await Promise.all(
          insertions.map(async (quad) => ({
            sql:
              `INSERT OR REPLACE INTO ${this.options.tablePrefix}documents (id, subject, predicate, object, embedding) VALUES (?, ?, ?, ?, vector32(?))`,
            args: [
              await skolemizeQuad(quad),
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

  public async search(
    query: string,
    limit = 10,
  ): Promise<SearchResult<SearchResultItem>[]> {
    const embedding = await this.options.embeddings.embed(query);
    const vectorString = JSON.stringify(embedding);

    // Hybrid search using RRF (Reciprocal Rank Fusion)
    const result = await this.options.client.execute({
      sql: `
      WITH vec_matches AS (
        SELECT
          id as rowid,
          row_number() OVER (PARTITION BY NULL) as rank_number
        FROM vector_top_k('${this.options.tablePrefix}search_idx', vector32(?), ?)
      ),
      fts_matches AS (
        SELECT
          rowid,
          row_number() OVER (ORDER BY rank) as rank_number,
          rank as score
        FROM ${this.options.tablePrefix}search_fts
        WHERE ${this.options.tablePrefix}search_fts MATCH ?
        LIMIT ?
      ),
      final AS (
        SELECT
          ${this.options.tablePrefix}documents.subject,
          ${this.options.tablePrefix}documents.predicate,
          ${this.options.tablePrefix}documents.object,
          vec_matches.rank_number as vec_rank,
          fts_matches.rank_number as fts_rank,
          (
            COALESCE(1.0 / (60 + fts_matches.rank_number), 0.0) * 1.0 +
            COALESCE(1.0 / (60 + vec_matches.rank_number), 0.0) * 1.0
          ) as combined_rank
        FROM fts_matches
        FULL OUTER JOIN vec_matches ON vec_matches.rowid = fts_matches.rowid
        JOIN ${this.options.tablePrefix}documents ON ${this.options.tablePrefix}documents.rowid = COALESCE(fts_matches.rowid, vec_matches.rowid)
        ORDER BY combined_rank DESC
        LIMIT ?
      )
      SELECT * FROM final
    `,
      args: [vectorString, limit, query, limit, limit],
    });

    return result.rows.map((row) => {
      if (
        typeof row.combined_rank !== "number" ||
        typeof row.subject !== "string" ||
        typeof row.predicate !== "string" ||
        typeof row.object !== "string"
      ) {
        throw new Error("Invalid search result");
      }

      return {
        score: row.combined_rank,
        value: {
          subject: row.subject,
          predicate: row.predicate,
          object: row.object,
        },
      };
    });
  }
}
