import type { Quad, Store, Term } from "oxigraph";
import type {
  Chunk,
  RankedResult,
  Statement,
  WorldMetadata,
} from "#/core/types/mod.ts";

export type { WorldMetadata };

/**
 * OxigraphService manages RDF graph stores and SPARQL operations.
 *
 * This service provides the core functionality for working with Worlds (RDF graphs):
 * - Store lifecycle management (create, read, update, delete)
 * - SPARQL query execution (SELECT, ASK, CONSTRUCT, DESCRIBE)
 * - SPARQL update operations (INSERT, DELETE)
 * - Full-text and semantic search capabilities
 *
 * The service uses Oxigraph (Wasm) for high-performance, standards-compliant
 * SPARQL 1.1 operations, with SQLite as the persistent storage layer.
 */
export interface OxigraphService {
  /**
   * listStores returns all world IDs in the system.
   *
   * @returns An array of world identifiers
   */
  listStores(): Promise<string[]>;

  /**
   * getStore retrieves an Oxigraph Store instance for a world.
   *
   * The store is hydrated from SQLite on cold starts and cached in memory
   * for subsequent requests. The store supports full SPARQL 1.1 operations.
   *
   * @param id - The unique world identifier
   * @returns The Oxigraph Store instance, or null if the world doesn't exist
   */
  getStore(id: string): Promise<Store | null>;

  /**
   * getMetadata retrieves metadata for a single world.
   *
   * @param id - The unique world identifier
   * @returns The world metadata, or null if the world doesn't exist
   */
  getMetadata(id: string): Promise<WorldMetadata | null>;

  /**
   * getManyMetadata retrieves metadata for multiple worlds in a single operation.
   *
   * This is more efficient than calling getMetadata multiple times.
   *
   * @param ids - An array of world identifiers
   * @returns An array of metadata objects (null for non-existent worlds)
   */
  getManyMetadata(ids: string[]): Promise<(WorldMetadata | null)[]>;

  /**
   * setStore creates or completely replaces a world's graph.
   *
   * This operation is atomic - the entire graph is replaced. For incremental
   * updates, use addQuads or SPARQL UPDATE operations.
   *
   * @param id - The unique world identifier
   * @param owner - The account ID that owns this world
   * @param store - The Oxigraph Store containing the graph data
   * @throws {Error} If the operation fails
   */
  setStore(id: string, owner: string, store: Store): Promise<void>;

  /**
   * addQuads adds RDF quads to an existing world.
   *
   * If the world doesn't exist, it will be created automatically (lazy claiming).
   * Duplicate quads are ignored (idempotent operation).
   *
   * @param id - The unique world identifier
   * @param owner - The account ID that owns this world
   * @param quads - An array of RDF quads to add
   * @throws {Error} If the operation fails
   */
  addQuads(id: string, owner: string, quads: Quad[]): Promise<void>;

  /**
   * query executes a SPARQL query against a world.
   *
   * Supports all SPARQL 1.1 query forms:
   * - SELECT: Returns variable bindings
   * - ASK: Returns a boolean
   * - CONSTRUCT: Returns an RDF graph
   * - DESCRIBE: Returns an RDF graph describing resources
   *
   * @param id - The unique world identifier
   * @param query - The SPARQL query string
   * @returns The query results (format depends on query type)
   * @throws {Error} If the query is invalid or the world doesn't exist
   *
   * @example
   * ```ts
   * const results = await service.query("world_123", `
   *   SELECT ?name WHERE {
   *     ?person <http://schema.org/name> ?name .
   *   }
   * `);
   * // Returns: Map<string, Term>[] with bindings for ?name
   * ```
   */
  query(
    id: string,
    query: string,
  ): Promise<boolean | Map<string, Term>[] | Quad[] | string>;

  /**
   * update executes a SPARQL UPDATE operation against a world.
   *
   * Supports INSERT, DELETE, and INSERT/DELETE operations. The update
   * is applied atomically and persisted to SQLite.
   *
   * @param id - The unique world identifier
   * @param query - The SPARQL UPDATE query string
   * @throws {Error} If the update is invalid or the world doesn't exist
   *
   * @example
   * ```ts
   * await service.update("world_123", `
   *   INSERT DATA {
   *     <http://example.com/alice> <http://schema.org/name> "Alice" .
   *   }
   * `);
   * ```
   */
  update(id: string, query: string): Promise<void>;

  /**
   * updateDescription updates the human-readable description of a world.
   *
   * @param id - The unique world identifier
   * @param description - The new description text
   * @throws {Error} If the world doesn't exist or the operation fails
   */
  updateDescription(id: string, description: string): Promise<void>;

  /**
   * removeStore permanently deletes a world and all its data.
   *
   * This operation is irreversible. All statements, chunks, and metadata
   * associated with the world are deleted.
   *
   * @param id - The unique world identifier
   * @throws {Error} If the operation fails
   */
  removeStore(id: string): Promise<void>;

  // Search Capability

  /**
   * searchStatements performs a full-text search over statements in a world.
   *
   * Currently implements simple LIKE-based search. Future versions will
   * support hybrid search with RRF (Reciprocal Rank Fusion) combining
   * FTS and vector search.
   *
   * @param id - The unique world identifier
   * @param query - The search query string
   * @returns An array of ranked statement results
   */
  searchStatements(
    id: string,
    query: string,
  ): Promise<RankedResult<Statement>[]>;

  /**
   * getStatement retrieves a specific statement by its ID.
   *
   * @param id - The unique world identifier
   * @param statementId - The unique statement identifier
   * @returns The statement if found, null otherwise
   */
  getStatement(
    id: string,
    statementId: number,
  ): Promise<Statement | null>;

  /**
   * searchChunks performs a search over text chunks in a world.
   *
   * Chunks are text segments derived from literal statements, used for
   * RAG (Retrieval-Augmented Generation) operations. Future versions will
   * support vector similarity search.
   *
   * @param id - The unique world identifier
   * @param query - The search query string
   * @returns An array of ranked chunk results
   */
  searchChunks(
    id: string,
    query: string,
  ): Promise<RankedResult<Chunk>[]>;

  /**
   * getChunk retrieves a specific chunk by its ID.
   *
   * @param id - The unique world identifier
   * @param chunkId - The unique chunk identifier
   * @returns The chunk if found, null otherwise
   */
  getChunk(
    id: string,
    chunkId: number,
  ): Promise<Chunk | null>;
}
