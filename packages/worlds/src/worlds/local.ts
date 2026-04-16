import { DataFactory, Parser, Store, Writer } from "n3";

import { ChunksSearchRepository } from "#/world/chunks/repository.ts";
import { NamespacesRepository } from "#/plugins/registry/namespaces.repository.ts";
import { ApiKeysRepository } from "#/plugins/registry/api-keys.repository.ts";
import { WorldsRepository } from "#/plugins/registry/worlds.repository.ts";
import { loadStore } from "#/world/triples/loader.ts";
import { handlePatch } from "#/rdf/patch/mod.ts";
import type { PatchHandler } from "#/rdf/patch/types.ts";
import { sparql } from "#/rdf/sparql.ts";
import { isSparqlUpdate } from "#/core/utils.ts";
import {
  DEFAULT_SERIALIZATION,
  getSerializationByContentType,
} from "#/rdf/core/serialization.ts";
import { worldSchema, worldsSparqlOutputSchema } from "#/schemas/mod.ts";
import type { WorldsInterface } from "#/core/types.ts";
import type { WorldOptions } from "#/storage/worlds.ts";
import type { WorldsContext } from "#/core/types.ts";
import {
  defaultWorldsNamespace,
  defaultWorldsNamespaceNameSegment,
  defaultWorldsWorldNameSegment,
} from "#/core/ontology.ts";
import { resolveSource, toWorldName } from "#/core/sources.ts";
import { worldResourcePath } from "#/core/resource-path.ts";
import type { WorldRow } from "#/plugins/registry/worlds.schema.ts";
import type {
  World,
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsExportInput,
  WorldsGetInput,
  WorldsImportInput,
  WorldsListInput,
  WorldsSearchInput,
  WorldsSearchOutput,
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
  WorldsUpdateInput,
} from "#/schemas/mod.ts";

const { namedNode, quad } = DataFactory;

/**
 * LocalWorlds is a server-side implementation of the Worlds interface.
 * Uses in-memory N3 Store backed by triples table for SPARQL queries.
 * Recommended max: 100K triples per world for in-memory Store loading.
 */
export class LocalWorlds implements WorldsInterface {
  private readonly worldsRepository: WorldsRepository;
  private registryInitialized?: Promise<void>;
  /**
   * True while ensureRegistry is running. Init during bootstrap must not
   * await registryInitialized to avoid deadlock.
   */
  private registryBootstrapping = false;
  private isClosed = false;
  private storeCache = new Map<string, Store>();

  /**
   * getStore retrieves or creates an N3 Store for the given world.
   */
  constructor(private readonly appContext: WorldsContext) {
    this.worldsRepository = new WorldsRepository(appContext.system);
  }

  private async getStore(
    options: WorldOptions,
  ): Promise<Store> {
    const { world, namespace } = options;
    const cacheKey = `${namespace ?? defaultWorldsNamespaceNameSegment}:${
      world ?? defaultWorldsWorldNameSegment
    }`;
    let store = this.storeCache.get(cacheKey);

    if (!store) {
      const managed = await this.appContext.storage.get(options);
      store = await loadStore(managed.database);
      this.storeCache.set(cacheKey, store);
    }

    return store;
  }

  private invalidateStore(options: WorldOptions): void {
    const { world, namespace } = options;
    const cacheKey = `${namespace ?? defaultWorldsNamespaceNameSegment}:${
      world ?? defaultWorldsWorldNameSegment
    }`;
    this.storeCache.delete(cacheKey);
  }

  /**
   * clearCache removes all cached N3 Stores.
   * Useful for test isolation between test runs.
   */
  public clearCache(): void {
    this.storeCache.clear();
  }

  /**
   * init initializes the engine and its background tasks.
   */
  public async init(): Promise<void> {
    this.ensureNotClosed();
    if (!this.registryInitialized) {
      this.registryInitialized = this.ensureRegistry();
    }
    await this.registryInitialized;
  }

  /**
   * ensureInitialized guarantees the registry is ready before operations.
   */
  private async ensureInitialized(): Promise<void> {
    this.ensureNotClosed();
    if (!this.registryInitialized) {
      this.registryInitialized = this.ensureRegistry();
    }
    await this.registryInitialized;
  }

  /**
   * ensureRegistry guarantees the presence of the registry database and seeds it if necessary.
   */
  private async ensureRegistry(): Promise<void> {
    this.registryBootstrapping = true;
    try {
      const namespaceRepo = new NamespacesRepository(
        this.appContext.system,
      );
      const existingNs = await namespaceRepo.get("_");
      if (existingNs) {
        return;
      }

      const now = Date.now();
      await namespaceRepo.insert({
        id: "_",
        label: "Root Namespace",
        created_at: now,
        updated_at: now,
      });

      if (this.appContext.apiKey) {
        const apiKeysRepo = new ApiKeysRepository(
          this.appContext.system,
        );
        await apiKeysRepo.create(this.appContext.apiKey, "_");
      }
    } finally {
      this.registryBootstrapping = false;
    }
  }

  /**
   * ensureNamespace ensures a namespace exists in the registry.
   */
  private async ensureNamespace(ns: string): Promise<void> {
    const namespaceRepo = new NamespacesRepository(
      this.appContext.system,
    );
    const existing = await namespaceRepo.get(ns);
    if (existing) {
      return;
    }

    const now = Date.now();
    await namespaceRepo.insert({
      id: ns,
      label: ns,
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * list paginates all available worlds from the system database.
   */
  async list(input?: WorldsListInput): Promise<World[]> {
    await this.ensureInitialized();
    let limit = 20;
    let offset = 0;

    if (input?.page && input?.pageSize) {
      limit = input.pageSize;
      offset = (input.page - 1) * input.pageSize;
    }

    const namespaceForList = (input?.namespace ?? this.appContext.namespace) ??
      null;
    this.assertSourceAuthorized(null, namespaceForList);

    const rows = await this.worldsRepository.list(
      namespaceForList,
      limit,
      offset,
    );
    return rows
      .map((world) =>
        worldSchema.parse({
          name: worldResourcePath(world.namespace, world.world).slice(1),
          world: world.world,
          namespace: world.namespace,
          label: world.label ?? undefined,
          description: world.description ?? undefined,
          createdAt: world.created_at,
          updatedAt: world.updated_at,
          deletedAt: world.deleted_at ?? undefined,
        })
      );
  }

  /**
   * get fetches a single world by its world.
   */
  async get(input: WorldsGetInput): Promise<World | null> {
    await this.ensureInitialized();
    const { world: sourceWorld, namespace } = resolveSource(
      input.source,
      { namespace: this.appContext.namespace },
    );
    this.assertSourceAuthorized(sourceWorld, namespace);
    const worldRow = await this.worldsRepository.get(
      sourceWorld ?? "",
      namespace,
    );
    if (!worldRow || worldRow.deleted_at !== null) {
      return null;
    }

    return worldSchema.parse({
      name: worldResourcePath(worldRow.namespace, worldRow.world).slice(1),
      world: worldRow.world,
      namespace: worldRow.namespace,
      label: worldRow.label ?? undefined,
      description: worldRow.description ?? undefined,
      createdAt: worldRow.created_at,
      updatedAt: worldRow.updated_at,
      deletedAt: worldRow.deleted_at ?? undefined,
    });
  }

  /**
   * create creates a new isolated world.
   */
  async create(data: WorldsCreateInput): Promise<World> {
    await this.ensureInitialized();
    const { world, namespace: inputNamespace, label, description } = data;

    const namespace = inputNamespace ?? this.appContext.namespace ??
      defaultWorldsNamespace;
    this.assertSourceAuthorized(world, namespace);
    const existingBySlug = await this.worldsRepository.get(
      world,
      namespace,
    );
    if (existingBySlug) {
      throw new Error("World world already exists");
    }

    const now = Date.now();
    const worldLabel = label ?? world ?? "Untitled";
    const worldNamespace = namespace ?? this.appContext.namespace ??
      defaultWorldsNamespaceNameSegment;
    const worldSlug = world ?? defaultWorldsWorldNameSegment;

    if (worldNamespace !== defaultWorldsNamespaceNameSegment) {
      await this.ensureNamespace(worldNamespace);
    }

    const worldRow = {
      namespace: worldNamespace,
      world: worldSlug,
      label: worldLabel,
      description: description ?? null,
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await this.worldsRepository.insert(worldRow);
    await this.appContext.storage.create({
      world: worldSlug,
      namespace: worldNamespace,
    });

    return worldSchema.parse({
      name: worldResourcePath(worldNamespace, worldSlug).slice(1),
      world: worldSlug,
      namespace,
      label: worldRow.label,
      description: worldRow.description ?? undefined,
      createdAt: worldRow.created_at,
      updatedAt: worldRow.updated_at,
      deletedAt: worldRow.deleted_at ?? undefined,
    });
  }

  /**
   * update updates a world's metadata.
   */
  async update(input: WorldsUpdateInput): Promise<void> {
    await this.ensureInitialized();
    const { source, label, description } = input;
    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );
    this.assertSourceAuthorized(sourceWorld, namespace);
    const worldRow = await this.worldsRepository.get(
      sourceWorld ?? "",
      namespace,
    );
    if (!worldRow) {
      throw new Error("World not found");
    }

    await this.worldsRepository.update(worldRow.world, worldRow.namespace, {
      label: label ?? worldRow.label,
      description: description !== undefined
        ? description
        : worldRow.description,
      updated_at: Date.now(),
    });
  }

  /**
   * delete marks a world as deleted.
   */
  async delete(input: WorldsDeleteInput): Promise<void> {
    await this.ensureInitialized();
    const { world: sourceWorld, namespace } = resolveSource(
      input.source,
      { namespace: this.appContext.namespace },
    );
    this.assertSourceAuthorized(sourceWorld, namespace);
    const worldRow = await this.worldsRepository.get(
      sourceWorld ?? "",
      namespace,
    );
    if (!worldRow) {
      throw new Error("World not found");
    }

    this.invalidateStore({
      world: worldRow.world,
      namespace: worldRow.namespace,
    });
    await this.worldsRepository.update(worldRow.world, worldRow.namespace, {
      deleted_at: Date.now(),
    });

    // Delete the actual Turso database to avoid orphaned resources
    await this.appContext.storage.delete({
      world: worldRow.world,
      namespace: worldRow.namespace ?? undefined,
    });
  }

  /**
   * sparql executes a SPARQL query or update against one or more worlds.
   */
  async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    await this.ensureInitialized();
    const { query } = input;
    const sources = input.sources ?? ["_"];
    const namespace = input.namespace ?? this.appContext.namespace;

    if (isSparqlUpdate(query) && sources.length !== 1) {
      throw new Error(
        "SPARQL Update is not supported for global or multi-source queries. Please specify a single target world.",
      );
    }

    let targetWorlds = [];
    if (sources.length === 1 && sources[0] === "*") {
      targetWorlds = await this.worldsRepository.list(namespace, 100, 0);
    } else {
      const worldPromises = sources.map((s) => {
        const parsed = resolveSource(s, { namespace });
        this.assertSourceAuthorized(parsed.world, parsed.namespace);
        return this.worldsRepository.get(
          parsed.world ?? "",
          parsed.namespace ?? namespace,
        );
      });
      const results = await Promise.all(worldPromises);
      targetWorlds = results.filter((w): w is WorldRow => w != null);
    }

    const worldStores = await Promise.all(
      targetWorlds.map((w) =>
        this.getStore({ world: w.world, namespace: w.namespace })
      ),
    );

    if (worldStores.length === 1) {
      const w = targetWorlds[0];
      const managed = await this.appContext.storage.get({
        world: w.world,
        namespace: w.namespace ?? undefined,
      });
      const patchHandler: PatchHandler = {
        patch: (patches) =>
          handlePatch(
            managed.database,
            this.appContext.vectors,
            patches,
          ),
      };
      const { result } = await sparql(worldStores, query, patchHandler);
      if (isSparqlUpdate(query)) {
        this.invalidateStore({ world: w.world, namespace: w.namespace });
      }
      return worldsSparqlOutputSchema.parse(result);
    }

    const { result } = await sparql(worldStores, query);
    return worldsSparqlOutputSchema.parse(result);
  }

  /**
   * search performs semantic/text search on triples using vector embeddings.
   */
  async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    await this.ensureInitialized();
    const { query, limit, subjects, predicates, types } = input;
    const sources = input.sources ?? ["_"];
    const requestedLimit = limit ?? 20;

    const chunksSearchRepository = new ChunksSearchRepository(
      this.appContext,
      this.worldsRepository,
    );

    const namespace = input.namespace ?? this.appContext.namespace;

    // Resolve target worlds
    let targetWorlds = [];
    if (sources.length === 1 && sources[0] === "*") {
      targetWorlds = await this.worldsRepository.list(namespace, 100, 0);
    } else {
      const worldPromises = sources.map((s) => {
        const parsed = resolveSource(s, { namespace });
        this.assertSourceAuthorized(parsed.world, parsed.namespace);
        return this.worldsRepository.get(
          parsed.world ?? "",
          parsed.namespace ?? namespace,
        );
      });
      const results = await Promise.all(worldPromises);
      targetWorlds = results.filter((w): w is WorldRow => w != null);
    }

    if (targetWorlds.length === 0) {
      return [];
    }

    const searchTasks = targetWorlds.map((world) =>
      chunksSearchRepository.search({
        query,
        worldRow: {
          namespace: world.namespace,
          world: world.world,
          label: world.label,
          description: world.description,
          db_hostname: world.db_hostname,
          db_token: world.db_token,
          created_at: world.created_at,
          updated_at: world.updated_at,
          deleted_at: world.deleted_at,
        },
        subjects,
        predicates,
        types,
        limit: requestedLimit,
      })
    );

    const allResults = await Promise.all(searchTasks);
    return allResults
      .flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, requestedLimit);
  }

  async import(input: WorldsImportInput): Promise<void> {
    await this.ensureInitialized();
    const { source, data, contentType } = input;
    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );
    this.assertSourceAuthorized(sourceWorld, namespace);
    const worldRow = await this.worldsRepository.get(
      sourceWorld,
      namespace,
    );
    if (!worldRow) {
      throw new Error("World not found");
    }

    const serialization = contentType
      ? getSerializationByContentType(contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const body = typeof data === "string"
      ? data
      : new TextDecoder().decode(data);
    const parser = new Parser({ format: serialization.format });
    const store = new Store();
    store.addQuads(parser.parse(body));

    const managed = await this.appContext.storage.get({
      namespace: worldRow.namespace,
      world: worldRow.world,
    });
    const now = Date.now();

    await handlePatch(
      managed.database,
      this.appContext.vectors,
      [{
        insertions: store.getQuads(null, null, null, null),
        deletions: [],
      }],
    );

    this.invalidateStore({
      world: worldRow.world,
      namespace: worldRow.namespace,
    });
    await this.worldsRepository.update(worldRow.world, worldRow.namespace, {
      updated_at: now,
    });
  }

  /**
   * export retrieves a world's facts in the specified RDF content type.
   */
  async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    await this.ensureInitialized();
    const { source, contentType } = input;
    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );
    this.assertSourceAuthorized(sourceWorld, namespace);
    const worldRow = await this.worldsRepository.get(
      sourceWorld,
      namespace,
    );
    if (!worldRow) {
      throw new Error(
        `World not found: ${sourceWorld} in namespace ${namespace}`,
      );
    }

    const serialization = contentType
      ? getSerializationByContentType(contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const store = await this.getStore({
      world: worldRow.world,
      namespace: worldRow.namespace,
    });
    const quads = store.getQuads(null, null, null, null);

    if (serialization.format === DEFAULT_SERIALIZATION.format) {
      return new Promise((resolve, reject) => {
        const writer = new Writer({ format: "N-Quads" });
        writer.addQuads(quads);
        writer.end((error: Error | null, result: string | undefined) => {
          if (error) reject(error);
          else resolve(new TextEncoder().encode(result).buffer);
        });
      });
    }

    const writer = new Writer({ format: serialization.format });
    writer.addQuads(quads);

    return new Promise((resolve, reject) => {
      writer.end((error: Error | null, result: string | undefined) => {
        if (error) reject(error);
        else resolve(new TextEncoder().encode(result).buffer);
      });
    });
  }

  /**
   * getServiceDescription retrieves the SPARQL service description.
   */
  getServiceDescription(input: WorldsServiceDescriptionInput): Promise<string> {
    const { endpointUrl, contentType } = input;
    const serialization = contentType
      ? getSerializationByContentType(contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    return new Promise((resolve, reject) => {
      const writer = new Writer({ format: serialization.format });

      const serviceDescriptionSuffix =
        "http://www.w3.org/ns/sparql-service-description#";
      const rdfNamespace = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
      const endpoint = namedNode(endpointUrl);
      const serviceType = namedNode(`${serviceDescriptionSuffix}Service`);
      const endpointProperty = namedNode(`${serviceDescriptionSuffix}endpoint`);

      writer.addQuad(
        quad(endpoint, namedNode(`${rdfNamespace}type`), serviceType),
      );
      writer.addQuad(quad(endpoint, endpointProperty, endpoint));

      const supportedFormat = namedNode(
        `${serviceDescriptionSuffix}supportedFormat`,
      );
      const jsonFormat = namedNode(
        "http://www.w3.org/ns/formats/SPARQL_Results_JSON",
      );
      const turtleFormat = namedNode(
        "http://www.w3.org/ns/formats/Turtle",
      );
      writer.addQuad(quad(endpoint, supportedFormat, jsonFormat));
      writer.addQuad(quad(endpoint, supportedFormat, turtleFormat));

      const supportedLanguage = namedNode(
        `${serviceDescriptionSuffix}supportedLanguage`,
      );
      const sparql11Query = namedNode(
        `${serviceDescriptionSuffix}SPARQL11Query`,
      );
      const sparql11Update = namedNode(
        `${serviceDescriptionSuffix}SPARQL11Update`,
      );
      const sparql12Query = namedNode(
        `${serviceDescriptionSuffix}SPARQL12Query`,
      );
      const sparql12Update = namedNode(
        `${serviceDescriptionSuffix}SPARQL12Update`,
      );
      writer.addQuad(quad(endpoint, supportedLanguage, sparql11Query));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql11Update));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql12Query));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql12Update));

      const feature = namedNode(`${serviceDescriptionSuffix}feature`);
      const unionDefaultGraph = namedNode(
        `${serviceDescriptionSuffix}UnionDefaultGraph`,
      );
      const dereferencesURIs = namedNode(
        `${serviceDescriptionSuffix}DereferencesURIs`,
      );
      const tripleTerms = namedNode(
        "http://www.w3.org/ns/sparql-service-description#TripleTerms",
      );
      writer.addQuad(quad(endpoint, feature, unionDefaultGraph));
      writer.addQuad(quad(endpoint, feature, dereferencesURIs));
      writer.addQuad(quad(endpoint, feature, tripleTerms));

      writer.end((error: Error | null, result: string | undefined) => {
        if (error) reject(error);
        else resolve(result as string);
      });
    });
  }

  /**
   * close shuts down the engine and all managed database connections.
   */
  async close(): Promise<void> {
    this.isClosed = true;
    this.storeCache.clear();
    await this.appContext.storage.close();
    this.appContext.system.close();
  }

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  /**
   * ensureNotClosed throws an error if the engine is closed.
   */
  private ensureNotClosed(): void {
    if (this.isClosed) {
      throw new Error("Engine is closed");
    }
  }

  /**
   * assertSourceAuthorized ensures the caller is authorized for the given resource.
   */
  private assertSourceAuthorized(
    world: string | null,
    namespace: string | null,
  ): void {
    if (this.registryBootstrapping) {
      return;
    }

    if (namespace !== this.appContext.namespace) {
      throw new Error(
        `Unauthorized access to namespace: ${namespace ?? "system"}`,
      );
    }
  }
}
