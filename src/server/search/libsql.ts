import type { Client } from "@libsql/client";
import type { Patch, PatchHandler, SearchResult } from "@fartlabs/search-store";
import { skolemizeQuad } from "@fartlabs/search-store";
import type { Embeddings } from "#/server/embeddings/embeddings.ts";
import * as searchDocumentsQueries from "#/server/db/resources/search-documents/queries.sql.ts";

/**
 * LibsqlSearchResult is a result from a search query.
 */
export type LibsqlSearchResult = SearchResult<LibsqlSearchResultItem>;

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
      // Note: The SQL file has a hardcoded embedding dimension of 1536.
      // TODO: Make embedding dimensions configurable in the SQL file.
      { sql: searchDocumentsQueries.documentsTable },
      // TODO: Monitor for native metadata filtering support in Libsql/Turso (sqlite-vec).
      // Once available, use PARTITION KEY on tenant_id to replace internal recall buffer hacks.

      // Index on tenant_id and world_id for efficient lookups/filtering.
      { sql: searchDocumentsQueries.documentsAccessIndex },

      // Vector index.
      { sql: searchDocumentsQueries.documentsVectorIndex },

      // FTS virtual table.
      { sql: searchDocumentsQueries.documentsFtsTable },

      // Triggers to keep FTS in sync.
      { sql: searchDocumentsQueries.documentsFtsInsertTrigger },
      { sql: searchDocumentsQueries.documentsFtsDeleteTrigger },
      { sql: searchDocumentsQueries.documentsFtsUpdateTrigger },
    ], "write");
  }

  /**
   * deleteTenant deletes all documents for a specific tenant.
   */
  public async deleteTenant(tenantId: string): Promise<void> {
    await this.options.client.execute({
      sql: searchDocumentsQueries.documentsDeleteTenant,
      args: [tenantId],
    });
  }

  /**
   * deleteWorld deletes all documents for a specific world within a tenant.
   */
  public async deleteWorld(tenantId: string, worldId: string): Promise<void> {
    await this.options.client.execute({
      sql: searchDocumentsQueries.documentsDeleteWorld,
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
            sql: searchDocumentsQueries.documentsDelete,
            args: [await skolemizeQuad(quad), tenantId, worldId],
          })),
        );
        await this.options.client.batch(deleteStmts, "write");
      }

      if (insertions.length > 0) {
        const insertStmts = await Promise.all(
          insertions.map(async (quad) => ({
            sql: searchDocumentsQueries.documentsUpsert,
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
      recallBuffer = 10,
    } = options;
    // NOTE: weightFts, weightVec, and rrfK are currently ignored as they're
    // hardcoded in the SQL file (1.0, 1.0, and 60 respectively).
    // TODO: Make these parameters configurable in the SQL file.
    const embedding = await this.options.embeddings.embed(query);
    const vectorString = JSON.stringify(embedding);

    // Use a larger internal limit for vector search to improve recall
    // This helps ensure tenant-specific results aren't filtered out by global ranking
    // TODO: Implement tiered recall buffer multiplier based on total document count per tenant
    // or global skew to maintain high recall for smaller tenants.
    const internalVectorLimit = limit * recallBuffer;

    // Choose the appropriate SQL query based on whether worldIds are provided
    let sql: string;
    let args: (string | number)[];

    if (worldIds && worldIds.length > 0) {
      // Use the query with world filtering
      sql = searchDocumentsQueries.documentsSearchByWorlds;
      args = [
        vectorString,
        internalVectorLimit,
        query,
        limit,
        tenantId,
        ...worldIds,
        limit,
      ];
    } else {
      // Use the query without world filtering
      sql = searchDocumentsQueries.documentsSearch;
      args = [
        vectorString,
        internalVectorLimit,
        query,
        limit,
        tenantId,
        limit,
      ];
    }

    const result = await this.options.client.execute({ sql, args });

    return result.rows.map((row) => {
      if (
        typeof row.combined_rank !== "number" ||
        typeof row.tenant_id !== "string" ||
        typeof row.world_id !== "string" ||
        typeof row.subject !== "string" ||
        typeof row.predicate !== "string" ||
        typeof row.object !== "string"
      ) {
        throw new Error("Invalid search result");
      }

      return {
        score: row.combined_rank,
        value: {
          tenantId: row.tenant_id,
          worldId: row.world_id,
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
