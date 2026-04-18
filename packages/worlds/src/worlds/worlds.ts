import type { Store } from "n3";
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
import type { ManagementLayer, WorldRow } from "../management/schema.ts";
import type { SearchIndex } from "../types.ts";
import { expandPathNamespace, resolveSource, toWorldName } from "../sources.ts";
import type { WorldsSource } from "../schema.ts";
import { ChunksSearchRepository } from "./chunks/repository.ts";
import { createIndexedStore } from "../rdf/patch/indexed-store.ts";
import { SearchIndexHandler } from "../rdf/patch/rdf-patch.ts";
import type { Embeddings } from "../vectors/embeddings.ts";
import { MemoryStoreManager } from "../storage.ts";
import type { WorldsEngine } from "../types.ts";

/**
 * WorldStoreResolver is a function that resolves a world coordinate to an RDF/JS store.
 */
export type WorldStoreResolver = (
  id: string,
  namespace?: string,
) => Promise<Store>;

/**
 * SyncableStore combines an RDF store with a sync operation for indexing.
 */
interface SyncableStore {
  store: Store;
  sync: () => Promise<void>;
}

/**
 * Worlds is an engine-agnostic implementation of the Worlds API.
 * It coordinates operations across standard RDF/JS stores and optional management/search layers.
 */
export class Worlds implements WorldsEngine {
  private readonly store?: Store;
  private readonly resolver?: WorldStoreResolver;
  private readonly searchIndex?: SearchIndex;
  private readonly management?: ManagementLayer;
  private readonly namespace?: string;
  private readonly world?: string;
  private readonly vectors?: Embeddings;

  constructor(options: {
    store?: Store;
    resolver?: WorldStoreResolver;
    search?: SearchIndex;
    management?: ManagementLayer;
    namespace?: string;
    world?: string;
    storage?: MemoryStoreManager;
    vectors?: Embeddings;
  }) {
    this.store = options.store;
    this.resolver = options.resolver;
    if (!this.resolver && options.storage) {
      this.resolver = async (id, ns) =>
        await options.storage!.get({ id, namespace: ns });
    }

    this.management = options.management;
    this.namespace = options.namespace;
    this.world = options.world;
    this.vectors = options.vectors;

    // Initialize search index: wrap vectors if a specific search backend is not provided
    if (options.search) {
      this.searchIndex = options.search;
    } else if (this.vectors) {
      this.searchIndex = new ChunksSearchRepository({
        vectors: this.vectors,
        management: this.management!,
        namespace: this.namespace,
        world: this.world,
        storage: options.storage,
      });
    }
  }

  /**
   * init initializes the engine.
   */
  public async init(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  public async [Symbol.asyncDispose](): Promise<void> {
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

    let rawStore: Store;
    if (this.store) {
      rawStore = this.store;
    } else if (this.resolver) {
      if (!worldId) {
        throw new Error("World ID is required when using a store resolver");
      }
      rawStore = await this.resolver(worldId, source.namespace ?? "_");
    } else {
      throw new Error(
        "Store or Resolver is required for data-plane operations",
      );
    }

    // Wrap in IndexedStore if indexing is possible
    if (this.vectors && worldId) {
      const handler = new SearchIndexHandler(
        worldId,
        this.vectors,
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

    const result = await mgmt.worlds.list({
      ...input,
      namespace,
    });

    return result.worlds.map((row) => ({
      name: toWorldName({
        namespace: row.namespace ?? undefined,
        world: row.id ?? undefined,
      }),
      id: row.id,
      world: row.id,
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

    const row = await mgmt.worlds.get(
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
      world: row.id,
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

    await mgmt.worlds.insert(row);

    return {
      name: toWorldName({
        namespace: row.namespace ?? undefined,
        world: row.id ?? undefined,
      }),
      id: row.id,
      world: row.id,
      namespace: row.namespace ?? undefined,
      label: row.label ?? undefined,
      description: row.description ?? undefined,
      createdAt: row.created_at,
      updated_at: row.updated_at,
      deletedAt: undefined,
    };
  }

  /**
   * update modifies a world's metadata.
   */
  public async update(input: WorldsUpdateInput): Promise<World> {
    const mgmt = this.ensureManagement();
    const resolved = resolveSource(input.source, { namespace: this.namespace });

    await mgmt.worlds.update(
      resolved.world!,
      resolved.namespace,
      {
        label: input.label,
        description: input.description,
      },
    );

    // Fetch the updated row since management.update returns void
    const result = await mgmt.worlds.get(resolved.world!, resolved.namespace);
    if (!result) throw new Error("World not found after update");

    return {
      name: toWorldName({
        namespace: result.namespace ?? undefined,
        world: result.id ?? undefined,
      }),
      id: result.id,
      world: result.id,
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

    await mgmt.worlds.delete(
      resolved.world!,
      resolved.namespace,
    );
  }

  /**
   * search executes a semantic search against the world.
   */
  public async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    if (!this.searchIndex) {
      throw new Error("Search index is required for search operations");
    }
    return await this.searchIndex.search(input);
  }

  /**
   * sparql executes a SPARQL query against the world.
   */
  public async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    const { store, sync } = await this.resolveStore(
      input.source ?? input.sources?.[0],
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
        importData = decodeBase64(importData);
      } catch (e) {
        // Fallback to treating as raw string if decoding fails
      }
    }

    const { Parser } = await import("n3");
    const parser = new Parser({
      format: input.contentType ?? "application/n-quads",
    });
    const content = typeof importData === "string"
      ? importData
      : new TextDecoder().decode(importData);

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
  }

  /**
   * export retrieves world data.
   */
  public async export(input: WorldsExportInput): Promise<Uint8Array> {
    const { store } = await this.resolveStore(input.source);
    const { Writer } = await import("n3");
    const writer = new Writer({
      format: input.contentType ?? "application/n-quads",
    });

    // @ts-ignore - n3 store types
    writer.addQuads(store.getQuads());

    return await new Promise<Uint8Array>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) reject(error);
        else resolve(new TextEncoder().encode(result));
      });
    });
  }

  /**
   * getServiceDescription returns the SPARQL service description.
   */
  public async getServiceDescription(
    input: WorldsServiceDescriptionInput,
  ): Promise<string> {
    const { store } = await this.resolveStore(input.source);
    // TODO: Implement actual service description based on store and endpoint
    return "";
  }
}

/**
 * LocalWorlds is a factory and alias for Worlds.
 */
export const LocalWorlds = Worlds;
