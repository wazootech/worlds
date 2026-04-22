import type { Quad } from "n3";
import type { WorldId } from "../resources/world.types.ts";
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
} from "../schema.ts";

import type { ManagementLayer, WorldRow } from "../management/worlds.ts";
import { mapRowsToWorlds, mapRowToWorld } from "../management/worlds.ts";
import { resolveSource } from "../sources/resolver.ts";
import { createIndexedStore } from "../infrastructure/rdf/patch/indexed-store.ts";
import { SearchIndexHandler } from "../infrastructure/rdf/patch/rdf-patch.ts";
import type { Embeddings } from "../vectors/embeddings.ts";
import type {
  SearchEngine,
  SparqlEngine,
  StoreEngine,
} from "../infrastructure/mod.ts";
import {
  generateBlobFromN3Store,
  generateN3StoreFromBlob,
} from "../infrastructure/rdf/n3.ts";
import { Store } from "n3";

/**
 * SyncableStore combines an N3 store with a sync method for handlers.
 */
export interface SyncableStore {
  store: Store<Quad, Quad, Quad, Quad>;
  sync: (patches?: unknown[]) => Promise<void>;
}

/**
 * WorldsEngineOptions are the options for creating a Worlds instance.
 */
export interface WorldsEngineOptions {
  storage?: StoreEngine;
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
  querySparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse>;
  searchWorlds(input: SearchWorldsRequest): Promise<SearchWorldsResponse>;
  importData(input: ImportWorldRequest): Promise<void>;
  exportData(input: ExportWorldRequest): Promise<ArrayBuffer>;
  [Symbol.asyncDispose](): Promise<void>;

  /**
   * sparql is a legacy alias for querySparql.
   * @deprecated Use querySparql instead.
   */
  sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse>;

  /**
   * search is a legacy alias for searchWorlds.
   * @deprecated Use searchWorlds instead.
   */
  search(input: SearchWorldsRequest): Promise<SearchWorldsResponse>;

  /**
   * import is a legacy alias for importData.
   * @deprecated Use importData instead.
   */
  import(input: ImportWorldRequest): Promise<void>;

  /**
   * export is a legacy alias for exportData.
   * @deprecated Use exportData instead.
   */
  export(input: ExportWorldRequest): Promise<ArrayBuffer>;
}


/**
 * Worlds is an engine-agnostic implementation of the Worlds API.
 */
export class Worlds implements WorldsEngine {
  private readonly storage?: StoreEngine;
  private searchEngine?: SearchEngine;
  private sparqlEngine?: SparqlEngine;
  private readonly management?: ManagementLayer;
  private readonly namespace?: string;
  private readonly id?: string;
  private readonly embeddings?: Embeddings;

  constructor(options: WorldsEngineOptions) {
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



  public async querySparql(
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

  public async sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse> {
    return this.querySparql(input);
  }

  public async searchWorlds(
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

  public async search(input: SearchWorldsRequest): Promise<SearchWorldsResponse> {
    return this.searchWorlds(input);
  }

  public async importData(input: ImportWorldRequest): Promise<void> {
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

  public async import(input: ImportWorldRequest): Promise<void> {
    return this.importData(input);
  }

  public async exportData(input: ExportWorldRequest): Promise<ArrayBuffer> {
    const { store } = await this.resolveStore(input.source);
    const n3Store = new Store();
    // @ts-ignore - n3 types
    n3Store.addQuads(store.getQuads());
    const blob = await generateBlobFromN3Store(n3Store);
    return await blob.arrayBuffer();
  }

  public async export(input: ExportWorldRequest): Promise<ArrayBuffer> {
    return this.exportData(input);
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
