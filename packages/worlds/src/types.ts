import type { Embeddings } from "#/vectors/embeddings.ts";
import { MemoryStoreManager } from "#/storage.ts";
import type { ApiKeyRepository } from "#/management/keys.ts";
import type { NamespaceRepository } from "#/management/namespaces.ts";
import type { WorldRepository } from "#/management/worlds.ts";
import type {
  World,
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsGetInput,
  WorldsUpdateInput,
} from "#/worlds/schema.ts";
import type {
  WorldsExportInput,
  WorldsImportInput,
  WorldsListInput,
} from "#/schema.ts";
import type {
  WorldsSearchInput,
  WorldsSearchOutput,
} from "#/worlds/search.schema.ts";
import type {
  WorldsSparqlInput,
  WorldsSparqlOutput,
} from "#/worlds/sparql.schema.ts";

/**
 * WorldsOptions are the options for the Worlds API SDK.
 */
export interface WorldsOptions {
  /**
   * baseUrl is the base URL of the Worlds API. It should not include the /v1 suffix.
   */
  baseUrl?: string;

  /**
   * apiKey is the API key for the Worlds API.
   */
  apiKey?: string;

  /**
   * fetch fetches a resource from the network.
   */
  fetch?: typeof globalThis.fetch;

  /**
   * namespace is the default namespace to use for this instance.
   */
  namespace?: string;
}

/**
 * SearchIndex defines the interface for semantic search backends.
 */
export interface SearchIndex {
  search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]>;
}

/**
 * WorldsEngine defines the primary interface for the Worlds engine.
 */
export interface WorldsEngine {
  list(input?: WorldsListInput): Promise<World[]>;
  get(input: WorldsGetInput): Promise<World | null>;
  create(input: WorldsCreateInput): Promise<World>;
  update(input: WorldsUpdateInput): Promise<World>;
  delete(input: WorldsDeleteInput): Promise<void>;
  sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput>;
  search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]>;
  import(input: WorldsImportInput): Promise<void>;
  export(input: WorldsExportInput): Promise<ArrayBuffer>;
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * ManagementLayer defines the interface for world and namespace metadata.
 */
export interface ManagementLayer {
  keys: ApiKeyRepository;
  namespaces: NamespaceRepository;
  worlds: WorldRepository;
}

/**
 * WorldsContext is the shared context for the Worlds engine.
 * In the new "Simple & Open" architecture, this is a minimalist configuration bag.
 */
export interface WorldsContext {
  /**
   * engine is the main Worlds engine instance.
   */
  engine?: WorldsEngine;

  /**
   * apiKey is an optional API key for authentication.
   */
  apiKey?: string;

  /**
   * vectors is the embedding strategy used for semantic or vector search.
   */
  vectors: Embeddings;

  /**
   * management provides handles for metadata operations.
   */
  management: ManagementLayer;

  /**
   * storage manages the underlying stores.
   */
  storage: MemoryStoreManager;

  /**
   * namespace is the default namespace for this context.
   */
  namespace?: string;

  /**
   * world is the default world for this context.
   */
  world?: string;

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  [Symbol.asyncDispose](): Promise<void>;
}
