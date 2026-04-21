import type { Quad } from "n3";
import type {
  ExportWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  DeleteWorldRequest,
  GetWorldRequest,
  GetServiceDescriptionRequest,
  SparqlQueryRequest,
  SparqlQueryResponse,
  UpdateWorldRequest,
  World,
  CreateWorldRequest,
  ListWorldsResponse,
  SearchWorldsRequest,
  SearchWorldsResponse,
  Source,
} from "../schema.ts";

import type { ManagementLayer, WorldRow } from "../management/worlds.ts";
import { resolveSource } from "../sources/resolver.ts";
import { createIndexedStore } from "../infrastructure/rdf/patch/indexed-store.ts";
import { SearchIndexHandler } from "../infrastructure/rdf/patch/rdf-patch.ts";
import type { Embeddings } from "../vectors/embeddings.ts";
import type {
  SearchEngine,
  SparqlEngine,
  StoreEngine,
} from "../infrastructure/mod.ts";
import { generateBlobFromN3Store, generateN3StoreFromBlob } from "../infrastructure/rdf/n3.ts";
import { Store } from "n3";

/**
 * SyncableStore combines an N3 store with a sync method for handlers.
 */
export interface SyncableStore {
  store: Store<Quad, Quad, Quad, Quad>;
  sync: (patches?: any[]) => Promise<void>;
}

/**
 * WorldsEngineOptions are the options for creating a Worlds instance.
 */
export interface WorldsEngineOptions {
  storeEngine?: StoreEngine;
  sparqlEngine?: SparqlEngine;
  searchEngine?: SearchEngine;
  embeddings?: Embeddings;
  management?: ManagementLayer;
  namespace?: string;
  id?: string;
}

/**
 * WorldsEngine defines the primary interface for the Worlds engine.
 */
export interface WorldsEngine {
  init(): Promise<void>;
  list(input?: ListWorldsRequest): Promise<ListWorldsResponse>;
  get(input: GetWorldRequest): Promise<World | null>;
  create(input: CreateWorldRequest): Promise<World>;
  update(input: UpdateWorldRequest): Promise<World>;
  delete(input: DeleteWorldRequest): Promise<void>;
  sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse>;
  search(input: SearchWorldsRequest): Promise<SearchWorldsResponse>;
  import(input: ImportWorldRequest): Promise<void>;
  export(input: ExportWorldRequest): Promise<ArrayBuffer>;
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * mapRowToWorld converts a management WorldRow to an API World object.
 */
function mapRowToWorld(row: WorldRow): World {
  return {
    id: row.id,
    namespace: row.namespace,
    displayName: row.label,
    description: row.description,
    createTime: row.created_at!,
    updateTime: row.updated_at!,
    deleteTime: row.deleted_at ?? undefined,
  };
}

/**
 * mapRowsToWorlds converts a list of WorldRows to API World objects.
 */
function mapRowsToWorlds(rows: WorldRow[]): World[] {
  return rows.map(mapRowToWorld);
}

/**
 * Worlds is an engine-agnostic implementation of the Worlds API.
 */
export class Worlds implements WorldsEngine {
  private readonly storeEngine?: StoreEngine;
  private readonly sparqlEngine?: SparqlEngine;
  private readonly searchEngine?: SearchEngine;
  private readonly management?: ManagementLayer;
  private readonly namespace?: string;
  private readonly id?: string;
  private readonly embeddings?: Embeddings;

  constructor(options: WorldsEngineOptions) {
    this.storeEngine = options.storeEngine;
    this.management = options.management;
    this.namespace = options.namespace;
    this.id = options.id;
    this.embeddings = options.embeddings;
    this.sparqlEngine = options.sparqlEngine;
    this.searchEngine = options.searchEngine;
  }

  public async init(): Promise<void> {
    return Promise.resolve();
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

    if (!this.storeEngine) {
      throw new Error(
        "StoreEngine is required for data-plane operations",
      );
    }


    if (!worldId) {
      throw new Error("World identity required");
    }

    const rawStore = await this.storeEngine.getStore(
      worldId,
      resolved.namespace,
    );

    if (this.embeddings) {
      const handler = new SearchIndexHandler(
        this.embeddings,
        worldId,
        resolved.namespace,
      );
      const indexed = createIndexedStore(rawStore as any, [handler]);
      return {
        store: indexed.store as any,
        sync: indexed.sync,
      };
    }

    return {
      store: rawStore as any,
      sync: async () => {},
    };
  }

  public async list(input?: ListWorldsRequest): Promise<ListWorldsResponse> {
    const mgmt = this.ensureManagement();
    const namespace = input?.parent || this.namespace;
    const result = await mgmt.worlds.list({ ...input, namespace });
    return {
      worlds: mapRowsToWorlds(result.worlds),
      nextPageToken: result.nextPageToken,
    };
  }

  public async get(input: GetWorldRequest): Promise<World | null> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });
    if (!resolved.id) return null;

    const row = await mgmt.worlds.get(resolved.id, resolved.namespace);
    if (!row) return null;

    return mapRowToWorld(row);
  }

  public async create(input: CreateWorldRequest): Promise<World> {
    const mgmt = this.ensureManagement();
    const nameOrId = input.id || input.name || input.world;
    if (!nameOrId) throw new Error("World identity required");

    const resolved = resolveSource(nameOrId, {
      namespace: input.parent || this.namespace,
    });

    const now = Date.now();
    await mgmt.worlds.insert({
      namespace: resolved.namespace,
      id: resolved.id!,
      label: input.displayName ?? resolved.id ?? "Untitled",
      description: input.description,
      connection_uri: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const row = await mgmt.worlds.get(resolved.id!, resolved.namespace);
    return mapRowToWorld(row!);
  }

  public async update(input: UpdateWorldRequest): Promise<World> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });
    if (!resolved.id) throw new Error("World ID required");

    const now = Date.now();
    await mgmt.worlds.update(resolved.id, resolved.namespace, {
      label: input.displayName,
      description: input.description,
      updated_at: now,
    });

    const result = await mgmt.worlds.get(resolved.id, resolved.namespace);
    return mapRowToWorld(result!);
  }

  public async delete(input: DeleteWorldRequest): Promise<void> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });
    if (!resolved.id) return;

    await mgmt.worlds.delete(resolved.id, resolved.namespace);
    if (this.storeEngine) {
      await this.storeEngine.delete(resolved.id, resolved.namespace);
    }
  }

  public async sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse> {
    if (this.sparqlEngine) {
      return await this.sparqlEngine.sparql(input);
    }

    const { store, sync } = await this.resolveStore(
      input.sources?.[0] || input.parent,
    );

    if (!this.sparqlEngine && !this.storeEngine) {
      throw new Error("SparqlEngine is required for SPARQL operations");
    }

    const { executeSparql } = await import("../infrastructure/rdf/sparql-engine.ts");
    const result = await executeSparql(store as any, input.query);
    await sync();
    return result;
  }

  public async search(input: SearchWorldsRequest): Promise<SearchWorldsResponse> {
    if (!this.searchEngine) {
      throw new Error("SearchEngine is required for search operations");
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

    const n3Store = await generateN3StoreFromBlob(new Blob([data]));
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
    const { store } = await this.resolveStore(input.sources?.[0]);
    // TODO: Implement actual service description
    return "";
  }

  public async [Symbol.asyncDispose](): Promise<void> {
    if (this.storeEngine) {
      if (typeof (this.storeEngine as any)[Symbol.asyncDispose] === "function") {
        await (this.storeEngine as any)[Symbol.asyncDispose]();
      }
    }
  }
}
