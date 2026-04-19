import type { Quad, Store } from "n3";
import type {
  WorldsExportInput,
  WorldsImportInput,
  WorldsListInput,
} from "./schema.ts";
import type {
  WorldsDeleteInput,
  WorldsGetInput,
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
  WorldsUpdateInput,
} from "./schema.ts";
import type {
  World,
  WorldsCreateInput,
  WorldsSearchInput,
  WorldsSearchOutput,
} from "./schema.ts";
import type { ManagementLayer } from "../management/schema.ts";
import type { WorldRow } from "../management/worlds.ts";
import {
  expandPathNamespace,
  resolveSource,
  toWorldName,
} from "../sources/resolver.ts";
import type { WorldsSource } from "#/schemas/input.ts";
import { createIndexedStore } from "../rdf/patch/indexed-store.ts";
import { SearchIndexHandler } from "../rdf/patch/rdf-patch.ts";
import type { Embeddings } from "../vectors/embeddings.ts";
import type { WorldsEngine } from "./worlds.ts";
import type {
  SearchEngine,
  SparqlEngine,
  StoreEngine,
} from "../engines/mod.ts";
import { ChunksSearchEngine } from "../engines/search.ts";

/**
 * SyncableStore combines an RDF store with a sync operation for indexing.
 */
interface SyncableStore {
  store: Store;
  sync: () => Promise<void>;
}

/**
 * WorldsEngineOptions defines the options for creating a Worlds engine.
 */
export interface WorldsEngineOptions {
  /**
   * storeEngine is the store engine for RDF persistence.
   * Required for data-plane operations (sparql, import, export).
   */
  storeEngine?: StoreEngine;

  /**
   * sparqlEngine is the SPARQL engine for RDF query operations.
   * Optional - if not provided, Worlds uses inline SPARQL execution.
   */
  sparqlEngine?: SparqlEngine;

  /**
   * searchEngine is the search engine for semantic search.
   * Optional - search() throws if not provided.
   */
  searchEngine?: SearchEngine;

  /**
   * embeddings is the embedding generator for search.
   * Used to create a default search engine if none provided.
   */
  embeddings?: Embeddings;

  /**
   * management is the management layer for world metadata.
   */
  management?: ManagementLayer;

  /**
   * namespace is the default namespace.
   */
  namespace?: string;

  /**
   * world is the default world name.
   */
  world?: string;
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
 * Worlds is an engine-agnostic implementation of the Worlds API.
 * It coordinates operations across store engines and optional search engines.
 */
export class Worlds implements WorldsEngine {
  private readonly storeEngine?: StoreEngine;
  private readonly sparqlEngine?: SparqlEngine;
  private readonly searchEngine?: SearchEngine;
  private readonly management?: ManagementLayer;
  private readonly namespace?: string;
  private readonly world?: string;
  private readonly embeddings?: Embeddings;

  constructor(options: WorldsEngineOptions) {
    this.storeEngine = options.storeEngine;
    this.management = options.management;
    this.namespace = options.namespace;
    this.world = options.world;
    this.embeddings = options.embeddings;
    this.sparqlEngine = options.sparqlEngine;

    // Create search engine if not provided but embeddings available
    if (options.searchEngine) {
      this.searchEngine = options.searchEngine;
    } else if (this.embeddings && this.management) {
      this.searchEngine = new ChunksSearchEngine({
        embeddings: this.embeddings,
        management: this.management!,
        namespace: this.namespace,
        world: this.world,
        storeEngine: this.storeEngine,
      });
    }
  }

  /**
   * init initializes the engine.
   */
  public init(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  public [Symbol.asyncDispose](): Promise<void> {
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
    inputSource?: WorldsSource,
  ): Promise<SyncableStore> {
    const source = resolveSource(inputSource, { namespace: this.namespace });
    const worldId = source.world ?? this.world;

    if (!this.storeEngine) {
      throw new Error(
        "StoreEngine is required for data-plane operations",
      );
    }

    const rawStore = await this.storeEngine.getStore(
      worldId,
      source.namespace,
    );

    // Wrap in IndexedStore if embeddings available
    if (this.embeddings && worldId) {
      const handler = new SearchIndexHandler(
        worldId,
        this.embeddings,
        source.namespace,
      );
      const { store, sync } = createIndexedStore(rawStore, [handler]);
      return { store, sync };
    }

    return { store: rawStore, sync: async () => {} };
  }

  /**
   * list paginates all available worlds.
   */
  public async list(input?: WorldsListInput): Promise<World[]> {
    const mgmt = this.ensureManagement();
    const namespace = expandPathNamespace(
      input?.namespace ?? this.namespace ?? null,
    );

    await Promise.resolve(); // Deno lint: keep async for interface compatibility
    const result = mgmt.worlds.list({
      ...input,
      namespace,
    });

    return result.worlds.map((row) => ({
      name: toWorldName({
        namespace: row.namespace ?? undefined,
        world: row.id ?? undefined,
      }),
      id: row.id,
      namespace: row.namespace ?? undefined,
      label: row.label ?? undefined,
      description: row.description ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at ?? undefined,
    }));
  }

  /**
   * get retrieves a specific world's metadata.
   */
  public async get(input: WorldsGetInput): Promise<World | null> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });

    await Promise.resolve();
    const row = mgmt.worlds.get(
      resolved.world!,
      resolved.namespace,
    );
    if (!row) return null;

    return {
      name: toWorldName({
        namespace: row.namespace ?? undefined,
        world: row.id ?? undefined,
      }),
      id: row.id,
      namespace: row.namespace ?? undefined,
      label: row.label ?? undefined,
      description: row.description ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at ?? undefined,
    };
  }

  /**
   * create registers a new world.
   */
  public async create(input: WorldsCreateInput): Promise<World> {
    const mgmt = this.ensureManagement();
    const nameOrWorld = input.name || input.world;
    if (!nameOrWorld) {
      throw new Error("World name/identifier is required");
    }
    const resolved = resolveSource(nameOrWorld, { namespace: this.namespace });

    const now = Date.now();
    const row: WorldRow = {
      namespace: resolved.namespace,
      id: resolved.world!,
      label: input.label ?? resolved.world ?? "Untitled",
      description: input.description,
      connection_uri: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await Promise.resolve();
    mgmt.worlds.insert(row);

    return {
      name: toWorldName({
        namespace: row.namespace ?? undefined,
        world: row.id ?? undefined,
      }),
      id: row.id,
      namespace: row.namespace ?? undefined,
      label: row.label ?? undefined,
      description: row.description ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: undefined,
    };
  }

  /**
   * update modifies a world's metadata.
   */
  public async update(input: WorldsUpdateInput): Promise<World> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });

    await Promise.resolve();
    mgmt.worlds.update(
      resolved.world!,
      resolved.namespace,
      {
        label: input.label,
        description: input.description,
      },
    );

    // Fetch the updated row since management.update returns void
    const result = mgmt.worlds.get(resolved.world!, resolved.namespace);
    if (!result) throw new Error("World not found after update");

    return {
      name: toWorldName({
        namespace: result.namespace ?? undefined,
        world: result.id ?? undefined,
      }),
      id: result.id,
      namespace: result.namespace ?? undefined,
      label: result.label ?? undefined,
      description: result.description ?? undefined,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      deletedAt: result.deleted_at ?? undefined,
    };
  }

  /**
   * delete removes a world.
   */
  public async delete(input: WorldsDeleteInput): Promise<void> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });

    await Promise.resolve();
    mgmt.worlds.delete(
      resolved.world!,
      resolved.namespace,
    );
  }

  /**
   * search executes a semantic search against the world.
   */
  public async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    if (!this.searchEngine) {
      throw new Error("SearchEngine is required for search operations");
    }
    return await this.searchEngine.search(input);
  }

  /**
   * sparql executes a SPARQL query against the world.
   */
  public async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    const { store, sync } = await this.resolveStore(
      input.sources?.[0],
    );

    // Lazy loading executeSparql
    const { executeSparql } = await import("../rdf/sparql-engine.ts");
    const result = await executeSparql(store, input.query);

    // Sync indexing if it was an update
    await sync();

    return result;
  }

  /**
   * import loads data into the store.
   */
  public async import(input: WorldsImportInput): Promise<void> {
    const { store, sync } = await this.resolveStore(input.source);
    let importData = input.data;

    // Detect and decode base64 if it's a string and doesn't look like RDF
    if (
      typeof importData === "string" && !importData.includes("<") &&
      !importData.includes("_:")
    ) {
      try {
        const { decodeBase64 } = await import("@std/encoding/base64");
        importData = decodeBase64(importData).buffer;
      } catch {
        // Fallback to treating as raw string if decoding fails
      }
    }

    const { Parser } = await import("n3");
    const parser = new Parser({
      format: input.contentType ?? "application/n-quads",
    });
    const content = typeof importData === "string"
      ? importData
      : new TextDecoder().decode(importData as ArrayBuffer);

    // Collect quads via callback to ensure completeness
    const quads = await new Promise<Quad[]>((resolve, reject) => {
      const q: Quad[] = [];
      parser.parse(content, (error, quad) => {
        if (error) reject(error);
        if (quad) q.push(quad);
        else resolve(q);
      });
    });

    // @ts-ignore - n3 store types
    store.addQuads(quads);

    // Sync indexing
    await sync();

    // Sync to search engine if available
    if (this.searchEngine?.applyPatches) {
      // Generate patches from the imported quads
      const patches = quads.map((q) => ({
        insertions: [q],
        deletions: [] as Quad[],
      }));
      await this.searchEngine.applyPatches(patches);
    }
  }

  /**
   * export retrieves world data.
   */
  public async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    const { store } = await this.resolveStore(input.source);
    const { Writer } = await import("n3");
    const writer = new Writer({
      format: input.contentType ?? "application/n-quads",
    });

    // @ts-ignore - n3 store types
    writer.addQuads(store.getQuads());

    return await new Promise<ArrayBuffer>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) reject(error);
        const encoder = new TextEncoder();
        resolve(encoder.encode(result).buffer);
      });
    });
  }

  /**
   * getServiceDescription returns the SPARQL service description.
   */
  public async getServiceDescription(
    input: WorldsServiceDescriptionInput,
  ): Promise<string> {
    const { store: _store } = await this.resolveStore(input.sources?.[0]);
    // TODO: Implement actual service description based on store and endpoint
    return "";
  }
}

/**
 * LocalWorlds is a factory and alias for Worlds.
 */
export const LocalWorlds = Worlds;
