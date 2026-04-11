import type { Client } from "@libsql/client";
import type { WorldsContext } from "#/core/types.ts";
import { searchChunks, upsertChunks } from "./queries.sql.ts";
import type { WorldsSearchOutput } from "#/schemas/mod.ts";
import type { WorldRow } from "#/plugins/registry/worlds.schema.ts";
import type { WorldsRepository } from "#/plugins/registry/worlds.repository.ts";
import {
  type ChunkTableUpsert,
  type SearchRow,
  searchRowSchema,
} from "./schema.ts";

/**
 * ChunksRepository handles the persistence of text chunks and their vector embeddings.
 */
export class ChunksRepository {
  /**
   * constructor initializes the ChunksRepository with a database client.
   * @param db The database client.
   */
  constructor(private readonly db: Client) {}

  /**
   * upsert inserts or replaces a text chunk record.
   * @param chunk The chunk data to upsert.
   */
  async upsert(chunk: ChunkTableUpsert): Promise<void> {
    await this.db.execute({
      sql: upsertChunks,
      args: [
        chunk.id,
        chunk.triple_id,
        chunk.subject,
        chunk.predicate,
        chunk.text,
        chunk.vector ? new Uint8Array(chunk.vector) : null,
      ],
    });
  }
}

/**
 * SearchParams represents the parameters for a semantic and text search.
 */
export interface SearchParams {
  /**
   * query is the natural language search string.
   */
  query: string;

  /**
   * worldSlug is the slug of the world to search within.
   */
  worldSlug?: string;

  /**
   * world is the optional pre-fetched world record.
   */
  world?: WorldRow;

  /**
   * subjects is an optional list of subject URIs to filter by.
   */
  subjects?: string[];

  /**
   * predicates is an optional list of predicate URIs to filter by.
   */
  predicates?: string[];

  /**
   * types is an optional list of item types to filter by.
   */
  types?: string[];

  /**
   * namespace is the optional namespace ID to search within.
   */
  namespace?: string;

  /**
   * limit is the maximum number of results to return.
   */
  limit?: number;
}

/**
 * ChunksSearchRepository handles complex semantic and hybrid search operations across chunks.
 */
export class ChunksSearchRepository {
  /**
   * constructor initializes the ChunksSearchRepository with context and worlds repository.
   * @param ctx The engine context.
   * @param worlds The worlds repository for lookup.
   */
  constructor(
    private readonly ctx: WorldsContext,
    private readonly worlds: WorldsRepository,
  ) {}

  /**
   * search performs a hybrid (vector + FTS) search for triples.
   * @param params The search parameters.
   * @returns An array of search results with scores.
   */
  async search(params: SearchParams): Promise<WorldsSearchOutput[]> {
    const {
      query,
      worldSlug,
      subjects,
      predicates,
      types,
      namespace: inputNamespace,
      limit = 10,
    } = params;

    const namespace = inputNamespace ?? this.ctx.namespace;

    // Generate Embeddings
    const vector = query
      ? await this.ctx.embeddings.embed(query)
      : new Array(1536).fill(0);

    // Procure world record if not provided
    let world = params.world;
    if (!world && worldSlug) {
      world = await this.worlds.get(worldSlug, namespace) ?? undefined;
    }

    if (!this.ctx.libsql.manager) {
      throw new Error("Search manager not available");
    }

    if (!world) {
      return [];
    }

    // Search across the target world
    try {
      const managed = await this.ctx.libsql.manager.get({
        slug: world.slug,
        namespace: world.namespace_id,
      });

      const subjectsParam = subjects && subjects.length > 0
        ? JSON.stringify(subjects)
        : null;
      const predicatesParam = predicates && predicates.length > 0
        ? JSON.stringify(predicates)
        : null;
      const typesParam = types && types.length > 0
        ? JSON.stringify(types)
        : null;
      const args = [
        new Uint8Array(new Float32Array(vector).buffer),
        limit,
        query,
        query,
        query,
        limit,
        query,
        subjectsParam,
        subjectsParam,
        predicatesParam,
        predicatesParam,
        typesParam,
        typesParam,
        limit,
      ];

      const result = await managed.database.execute({
        sql: searchChunks,
        args,
      });

      const results: WorldsSearchOutput[] = (
        result.rows as unknown as SearchRow[]
      ).map((untrustedRow) => {
        const row = searchRowSchema.parse(untrustedRow);
        return {
          subject: row.subject,
          predicate: row.predicate,
          object: row.object,
          vecRank: row.vec_rank,
          ftsRank: row.fts_rank,
          score: row.combined_rank,
          slug: world.slug,
        };
      });

      // Sort by combined rank and limit
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error(`Search error for world ${world.slug}:`, error);
      return [];
    }
  }
}
