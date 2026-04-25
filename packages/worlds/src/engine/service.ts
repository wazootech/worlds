import type { Quad } from "n3";

import type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetServiceDescriptionRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  ListWorldsResponse,
  SearchWorldsRequest,
  SearchWorldsResponse,
  Source,
  SparqlQueryRequest,
  SparqlQueryResponse,
  UpdateWorldRequest,
  World,
  WorldId,
} from "#/schema.ts";

import { RemoteWorlds } from "#/sdk/client.ts";

import type { ManagementLayer, WorldRow } from "#/management/worlds.ts";
import { resolveSource } from "#/sources/resolver.ts";
import { createIndexedStore } from "#/infrastructure/rdf/patch/indexed-store.ts";
import { SearchIndexHandler } from "#/infrastructure/rdf/patch/rdf-patch.ts";
import type { Embeddings } from "#/vectors/embeddings.ts";
import type {
  SearchEngine,
  SparqlEngine,
  StoreEngine,
} from "#/infrastructure/mod.ts";
import {
  generateBlobFromN3Store,
  generateN3StoreFromBlob,
} from "#/infrastructure/rdf/n3.ts";
import { Store } from "n3";
import { resolveConfig } from "#/config.ts";
import { KvStoreEngine } from "#/infrastructure/store.ts";
import { ApiKeyRepository } from "#/management/keys.ts";
import { NamespaceRepository } from "#/management/namespaces.ts";
import { WorldRepository } from "#/management/worlds.ts";

/**
 * SyncableStore combines an N3 store with a sync method for handlers.
 */
export interface SyncableStore {
  store: Store<Quad, Quad, Quad, Quad>;
  sync: (patches?: unknown[]) => Promise<void>;
}

/**
 * DataPlane defines the data operations interface (SPARQL, Search, Import/Export).
 */
export interface DataPlane {
  sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse>;
  search(input: SearchWorldsRequest): Promise<SearchWorldsResponse>;
  import(input: ImportWorldRequest): Promise<void>;
  export(input: ExportWorldRequest): Promise<ArrayBuffer>;
}

/**
 * ManagementPlane defines the lifecycle management interface.
 */
export interface ManagementPlane {
  getWorld(input: GetWorldRequest): Promise<World | null>;
  createWorld(input: CreateWorldRequest): Promise<World>;
  updateWorld(input: UpdateWorldRequest): Promise<World>;
  deleteWorld(input: DeleteWorldRequest): Promise<void>;
  listWorlds(input?: ListWorldsRequest): Promise<ListWorldsResponse>;
}

/**
 * WorldsInterface defines the primary interface for Worlds.
 * Combines DataPlane and ManagementPlane into a single unified interface.
 */
export interface WorldsInterface extends DataPlane, ManagementPlane {
  init(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * EmbeddedWorldsOptions are the options for creating an EmbeddedWorlds instance.
 */
export interface EmbeddedWorldsOptions {
  storage?: StoreEngine;
  sparqlEngine?: SparqlEngine;
  searchEngine?: SearchEngine;
  embeddings?: Embeddings;
  management?: ManagementLayer;
  namespace?: string;
  id?: string;
}

/**
 * WorldsOptions are the options for creating a Worlds instance.
 * Supports URL-based configuration (scheme determines backend) or direct injection.
 */
export interface WorldsOptions {
  url?: string;
  authToken?: string;
  fetch?: typeof fetch;
  namespace?: string;

  storage?: StoreEngine;
  sparqlEngine?: SparqlEngine;
  searchEngine?: SearchEngine;
  embeddings?: Embeddings;
  management?: ManagementLayer;
  id?: string;
}

/**
 * RemoteWorldsOptions are the options for creating a RemoteWorlds instance.
 */
export interface RemoteWorldsOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
}

/**
 * EmbeddedWorlds is the local/embedded implementation of WorldsInterface.
 */
export class EmbeddedWorlds implements WorldsInterface {
  private readonly storage?: StoreEngine;
  private searchEngine?: SearchEngine;
  private sparqlEngine?: SparqlEngine;
  private readonly management?: ManagementLayer;
  private readonly namespace?: string;
  private readonly id?: string;
  private readonly embeddings?: Embeddings;

  constructor(options: EmbeddedWorldsOptions) {
    this.storage = options.storage;
    this.management = options.management;
    this.namespace = options.namespace;
    this.id = options.id;
    this.embeddings = options.embeddings;
    this.sparqlEngine = options.sparqlEngine;
    this.searchEngine = options.searchEngine;
  }

  public init(): Promise<void> {
    return Promise.resolve();
  }

  public getWorld(input: GetWorldRequest): Promise<World | null> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });
    if (!resolved.id) return Promise.resolve(null);
    const row = mgmt.worlds.get(resolved.id, resolved.namespace);
    return Promise.resolve(row ? this.mapRowToWorld(row) : null);
  }

  public createWorld(input: CreateWorldRequest): Promise<World> {
    const mgmt = this.ensureManagement();
    const nameOrId = input.id ||
      (input as Record<string, unknown>).name as string ||
      (input as Record<string, unknown>).world as string;
    if (!nameOrId) return Promise.reject(new Error("World identity required"));

    const resolved = resolveSource(nameOrId, {
      namespace: input.parent || this.namespace,
    });

    const now = Date.now();
    mgmt.worlds.insert({
      namespace: resolved.namespace,
      id: resolved.id!,
      label: input.displayName ?? resolved.id ?? "Untitled",
      description: input.description,
      connection_uri: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const row = mgmt.worlds.get(resolved.id!, resolved.namespace);
    return Promise.resolve(this.mapRowToWorld(row!));
  }

  public updateWorld(input: UpdateWorldRequest): Promise<World> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });
    if (!resolved.id) return Promise.reject(new Error("World ID required"));

    const now = Date.now();
    mgmt.worlds.update(resolved.id, resolved.namespace, {
      label: input.displayName,
      description: input.description,
      updated_at: now,
    });

    const row = mgmt.worlds.get(resolved.id, resolved.namespace);
    return Promise.resolve(this.mapRowToWorld(row!));
  }

  public deleteWorld(input: DeleteWorldRequest): Promise<void> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });
    if (!resolved.id) return Promise.resolve();
    mgmt.worlds.delete(resolved.id, resolved.namespace);
    return Promise.resolve();
  }

  public listWorlds(
    input?: ListWorldsRequest,
  ): Promise<ListWorldsResponse> {
    const mgmt = this.ensureManagement();
    const namespace = input?.parent || this.namespace;
    const result = mgmt.worlds.list({ ...input, namespace });
    return Promise.resolve({
      worlds: result.worlds.map(this.mapRowToWorld),
      nextPageToken: result.nextPageToken,
    });
  }

  private mapRowToWorld(row: WorldRow): World {
    return {
      id: row.id as WorldId,
      namespace: row.namespace,
      displayName: row.label,
      description: row.description,
      createTime: row.created_at!,
      updateTime: row.updated_at!,
      deleteTime: row.deleted_at ?? undefined,
    };
  }

  private ensureManagement(): ManagementLayer {
    if (!this.management) {
      throw new Error(
        "Management layer is required for world metadata operations",
      );
    }
    return this.management;
  }

  private async resolveStore(
    inputSource?: Source,
  ): Promise<SyncableStore> {
    const resolved = resolveSource(inputSource, { namespace: this.namespace });
    const worldId = resolved.id ?? this.id;

    if (!this.storage) {
      throw new Error(
        "StoreEngine is required for data-plane operations",
      );
    }

    if (!worldId) {
      throw new Error("World identity required");
    }

    const rawStore = await this.storage.getStore(
      worldId,
      resolved.namespace,
    );

    if (this.embeddings) {
      const handler = new SearchIndexHandler(
        this.embeddings,
        worldId,
        resolved.namespace,
      );
      const indexed = createIndexedStore(rawStore as unknown as Store, [
        handler,
      ]);
      return {
        // deno-lint-ignore no-explicit-any
        store: indexed.store as any,
        sync: indexed.sync,
      };
    }

    return {
      // deno-lint-ignore no-explicit-any
      store: rawStore as any,
      sync: async () => {},
    };
  }

  public async sparql(
    input: SparqlQueryRequest,
  ): Promise<SparqlQueryResponse> {
    if (this.sparqlEngine) {
      return await this.sparqlEngine.sparql(input);
    }

    const { store, sync } = await this.resolveStore(
      input.sources?.[0] || input.parent,
    );

    // Dynamic import to keep engine core lean

    const { executeSparql } = await import(
      "../infrastructure/rdf/sparql-engine.ts"
    );
    const result = await executeSparql(store as unknown as Store, input.query);
    await sync();
    return result;
  }

  public async search(
    input: SearchWorldsRequest,
  ): Promise<SearchWorldsResponse> {
    if (!this.searchEngine) {
      if (this.embeddings && this.management) {
        const { ChunksSearchEngine } = await import(
          "../infrastructure/search.ts"
        );
        this.searchEngine = new ChunksSearchEngine({
          embeddings: this.embeddings,
          management: this.management,
          namespace: this.namespace,
          storeEngine: this.storage,
        });
      } else {
        throw new Error("SearchEngine is required for search operations");
      }
    }

    const resolved = resolveSource(
      input.sources?.[0] || input.parent,
      { namespace: this.namespace },
    );

    const result = await this.searchEngine.search({
      ...input,
      parent: resolved.namespace,
    });

    return {
      results: result,
    };
  }

  public async import(input: ImportWorldRequest): Promise<void> {
    const { store, sync } = await this.resolveStore(input.source);
    const data = typeof input.data === "string"
      ? new TextEncoder().encode(input.data).buffer
      : input.data;

    const n3Store = await generateN3StoreFromBlob(
      new Blob([data as unknown as BlobPart]),
      input.contentType || "application/n-quads",
    );
    const quads = n3Store.getQuads(null, null, null, null);

    // @ts-ignore - n3 types
    store.addQuads(quads);
    await sync();
  }

  public async export(input: ExportWorldRequest): Promise<ArrayBuffer> {
    const { store } = await this.resolveStore(input.source);
    const n3Store = new Store();
    // @ts-ignore - n3 types
    n3Store.addQuads(store.getQuads());
    const blob = await generateBlobFromN3Store(n3Store);
    return await blob.arrayBuffer();
  }

  public async getServiceDescription(
    input: GetServiceDescriptionRequest,
  ): Promise<string> {
    const { store: _store } = await this.resolveStore(input.sources?.[0]);
    // TODO: Implement actual service description
    return "";
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    if (this.storage) {
      // deno-lint-ignore no-explicit-any
      const engine = this.storage as any;
      if (typeof engine[Symbol.asyncDispose] === "function") {
        await engine[Symbol.asyncDispose]();
      }
    }
  }
}

/**
 * Worlds is the unified entry point that conditionally wraps either
 * EmbeddedWorlds or RemoteWorlds based on configuration.
 */
export class Worlds implements WorldsInterface {
  private impl: WorldsInterface;

  constructor(options: WorldsOptions = {}) {
    const hasDirectInjection = options.storage || options.embeddings ||
      options.management;

    if (hasDirectInjection) {
      this.impl = new EmbeddedWorlds({
        storage: options.storage,
        embeddings: options.embeddings,
        management: options.management,
        namespace: options.namespace,
        id: options.id,
        sparqlEngine: options.sparqlEngine,
        searchEngine: options.searchEngine,
      });
      return;
    }

    const config = resolveConfig(options);

    if (config.mode === "embedded") {
      const storage = new KvStoreEngine();
      const management: ManagementLayer = {
        keys: new ApiKeyRepository(),
        namespaces: new NamespaceRepository(),
        worlds: new WorldRepository(),
      };

      this.impl = new EmbeddedWorlds({
        storage,
        embeddings: options.embeddings,
        management,
        namespace: config.namespace,
      });
    } else {
      if (!config.baseUrl) {
        throw new Error("Remote mode requires a base URL");
      }
      this.impl = new RemoteWorlds({
        baseUrl: config.baseUrl,
        apiKey: config.authToken ?? "anonymous",
        fetch: options.fetch,
      });
    }
  }

  public init(): Promise<void> {
    return this.impl.init();
  }

  public getWorld(input: GetWorldRequest): Promise<World | null> {
    return this.impl.getWorld(input);
  }

  public createWorld(input: CreateWorldRequest): Promise<World> {
    return this.impl.createWorld(input);
  }

  public updateWorld(input: UpdateWorldRequest): Promise<World> {
    return this.impl.updateWorld(input);
  }

  public deleteWorld(input: DeleteWorldRequest): Promise<void> {
    return this.impl.deleteWorld(input);
  }

  public listWorlds(
    input?: ListWorldsRequest,
  ): Promise<ListWorldsResponse> {
    return this.impl.listWorlds(input);
  }

  public sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse> {
    return this.impl.sparql(input);
  }

  public search(
    input: SearchWorldsRequest,
  ): Promise<SearchWorldsResponse> {
    return this.impl.search(input);
  }

  public import(input: ImportWorldRequest): Promise<void> {
    return this.impl.import(input);
  }

  public export(input: ExportWorldRequest): Promise<ArrayBuffer> {
    return this.impl.export(input);
  }

  public [Symbol.asyncDispose](): Promise<void> {
    return this.impl[Symbol.asyncDispose]();
  }
}
