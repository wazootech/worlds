import { DataFactory, Parser, Store, Writer } from "n3";

import { ChunksSearchRepository } from "#/world/chunks/repository.ts";
import { WorldsRepository } from "#/plugins/registry/worlds.repository.ts";
import { loadStore } from "#/world/triples/loader.ts";
import { TriplesPatchHandler } from "#/world/triples/loader.ts";

import { BatchPatchHandler, handlePatch } from "#/rdf/patch/mod.ts";
import { sparql } from "#/rdf/sparql.ts";
import { isSparqlUpdate } from "#/core/utils.ts";
import {
  DEFAULT_SERIALIZATION,
  getSerializationByContentType,
} from "#/rdf/core/serialization.ts";
import { worldSchema, worldsSparqlOutputSchema } from "#/schemas/mod.ts";
import type { WorldsInterface } from "#/core/types.ts";
import type { Patch } from "#/rdf/patch/mod.ts";
import type { WorldsContext } from "#/core/types.ts";
import {
  WORLDS,
  WORLDS_WORLD_ID,
} from "#/core/ontology.ts";
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
  private registryWorldInitialized?: Promise<void>;
  private isClosed = false;
  private storeCache = new Map<string, Store>();

  constructor(private readonly appContext: WorldsContext) {
    this.worldsRepository = new WorldsRepository(appContext.libsql.database);
  }

  private async getStore(
    namespace: string,
    slug: string,
  ): Promise<Store> {
    const cacheKey = `${namespace}:${slug}`;
    let store = this.storeCache.get(cacheKey);

    if (!store) {
      const managed = await this.appContext.libsql.manager.get({
        namespace,
        slug,
      );
      store = await loadStore(managed.database);
      this.storeCache.set(cacheKey, store);
    }

    return store;
  }

  private invalidateStore(namespace: string, slug: string): void {
    const cacheKey = `${namespace}:${slug}`;
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
    if (!this.registryWorldInitialized) {
      this.registryWorldInitialized = this.ensureRegistryWorld();
    }
    await this.registryWorldInitialized;
  }

  /**
   * ensureRegistryWorld guarantees the presence of the registry world and seeds it if necessary.
   */
  private async ensureRegistryWorld(): Promise<void> {
    const existing = await this.worldsRepository.get(
      WORLDS_WORLD_ID,
      undefined as string | undefined,
    );
    if (existing) {
      return;
    }

    const now = Date.now();
    try {
      await this.worldsRepository.insert({
        namespace_id: undefined as string | undefined,
        slug: WORLDS_WORLD_ID,
        label: "Registry",
        description: "Worlds platform registry and control plane.",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      await this.appContext.libsql.manager.create(
        undefined as string | undefined,
        WORLDS_WORLD_ID,
      );
    } catch (error) {
      const checkAgain = await this.worldsRepository.get(
        WORLDS_WORLD_ID,
        undefined as string | undefined,
      );
      if (!checkAgain) {
        throw error;
      }
    }

    if (this.appContext.apiKey) {
      const namespace = undefined ?? undefined as string | undefined;
      const keyId = `${WORLDS.BASE}keys/bootstrap`;

      await this._sparql({
        world: WORLDS_WORLD_ID,
        query: `
          PREFIX registry: <${WORLDS.NAMESPACE}>
          INSERT DATA {
            <${namespace}> a <${WORLDS.Namespace}> ;
              <${WORLDS.hasLabel}> "Root Namespace" ;
              <${WORLDS.createdAt}> ${now} .
            
            <${keyId}> a <${WORLDS.ApiKey}> ;
              <${WORLDS.belongsTo}> <${namespace}> ;
              <${WORLDS.hasSecret}> "${this.appContext.apiKey}" ;
              <${WORLDS.createdAt}> ${now} .
          }
        `,
      });
    }
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

    const namespace = undefined ?? undefined as string | undefined;
    const rows = await this.worldsRepository.list(namespace, limit, offset);
    return rows.map((world) =>
      worldSchema.parse({
        id: world.slug,
        slug: world.slug,
        label: world.label,
        description: world.description,
        createdAt: world.created_at,
        updatedAt: world.updated_at,
        deletedAt: world.deleted_at,
      })
    );
  }

  /**
   * get fetches a single world by its slug.
   */
  async get(input: WorldsGetInput): Promise<World | null> {
    await this.ensureInitialized();
    const namespace = input.slug === WORLDS_WORLD_ID
      ? undefined
      : undefined;
    const world = await this.worldsRepository.get(input.slug, namespace);
    if (!world || world.deleted_at !== null) {
      return null;
    }

    return worldSchema.parse({
      id: world.slug,
      slug: world.slug,
      label: world.label,
      description: world.description,
      createdAt: world.created_at,
      updatedAt: world.updated_at,
      deletedAt: world.deleted_at,
    });
  }

  /**
   * create creates a new isolated world.
   */
  async create(data: WorldsCreateInput): Promise<World> {
    await this.ensureInitialized();
    const { slug, namespace: inputNamespace, label, description } = data;

    const namespace = inputNamespace ?? undefined;
    const existingBySlug = await this.worldsRepository.get(
      slug,
      namespace,
    );
    if (existingBySlug) {
      throw new Error("World slug already exists");
    }

    const now = Date.now();
    const worldLabel = label ?? slug;
    const worldRow = {
      namespace_id: namespace ?? "",
      slug,
      label: worldLabel,
      description: description ?? null,
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await this.worldsRepository.insert(worldRow);
    await this.appContext.libsql.manager.create(namespace ?? "", slug);

    return worldSchema.parse({
      world: slug,
      namespace,
      label: worldRow.label,
      description: worldRow.description,
      createdAt: worldRow.created_at,
      updatedAt: worldRow.updated_at,
      deletedAt: worldRow.deleted_at,
    });
  }

  /**
   * update updates a world's metadata.
   */
  async update(input: WorldsUpdateInput): Promise<void> {
    await this.ensureInitialized();
    const { slug, namespace: inputNamespace, ...data } = input;
    const namespace = inputNamespace ?? undefined;
    const world = await this.worldsRepository.get(slug, namespace);
    if (!world) {
      throw new Error("World not found");
    }

    await this.worldsRepository.update(slug, namespace, {
      label: data.label ?? world.label,
      description: data.description !== undefined
        ? data.description
        : world.description,
      updated_at: Date.now(),
    });
  }

  /**
   * delete marks a world as deleted.
   */
  async delete(input: WorldsDeleteInput): Promise<void> {
    await this.ensureInitialized();
    const namespace = input.slug === WORLDS_WORLD_ID
      ? undefined
      : undefined;
    const world = await this.worldsRepository.get(input.slug, namespace);
    if (!world) {
      throw new Error("World not found");
    }

    this.invalidateStore(namespace ?? "", input.slug);
    await this.worldsRepository.update(input.slug, namespace, {
      deleted_at: Date.now(),
    });
  }

  /**
   * sparql executes a SPARQL query or update against a specific world.
   */
  async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    await this.ensureInitialized();
    return this._sparql(input);
  }

  /**
   * _sparql is the internal implementation that bypasses the initialization check.
   */
  private async _sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    const { world: slug, query } = input;
    const namespace = slug === WORLDS_WORLD_ID
      ? undefined as string | undefined
      : (undefined ?? undefined as string | undefined);
    const world = await this.worldsRepository.get(slug, namespace);
    if (!world) {
      throw new Error(`World not found: ${slug} in namespace ${namespace}`);
    }

    const managed = await this.appContext.libsql.manager.get({
      namespace,
      slug,
    );
    const patchHandler = new TriplesPatchHandler(managed.database);
    const batchHandler = new BatchPatchHandler(patchHandler);

    const store = await this.getStore(namespace, slug);
    const { result } = await sparql(store, query, batchHandler);

    const isUpdate = await isSparqlUpdate(query);
    if (isUpdate) {
      await batchHandler.commit();

      // Also run handlePatch to create chunks from the updated store
      await handlePatch(
        managed.database,
        this.appContext.embeddings,
        [{
          insertions: store.getQuads(null, null, null, null),
          deletions: [],
        }],
      );

      this.invalidateStore(namespace, slug);

      await this.worldsRepository.update(slug, namespace, {
        updated_at: Date.now(),
      });

      return null;
    }

    return worldsSparqlOutputSchema.parse(result);
  }

  /**
   * search performs semantic/text search on triples using vector embeddings.
   */
  async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    await this.ensureInitialized();
    const { world: slug, query, limit, subjects, predicates, types } = input;
    const namespace = slug === WORLDS_WORLD_ID
      ? undefined as string | undefined
      : (undefined ?? undefined as string | undefined);
    const world = await this.worldsRepository.get(slug, namespace);
    if (!world) {
      throw new Error("World not found");
    }

    const chunksSearchRepository = new ChunksSearchRepository(
      this.appContext,
      this.worldsRepository,
    );
    const results = await chunksSearchRepository.search({
      query,
      world,
      subjects,
      predicates,
      types,
      limit: limit ?? 20,
    });

    return results;
  }

  async import(input: WorldsImportInput): Promise<void> {
    await this.registryWorldInitialized;
    const { world: slug, data, contentType } = input;
    const namespace = slug === WORLDS_WORLD_ID
      ? undefined as string | undefined
      : (undefined ?? undefined as string | undefined);
    const world = await this.worldsRepository.get(slug, namespace);
    if (!world) {
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

    const managed = await this.appContext.libsql.manager.get({
      namespace,
      slug,
    );
    const now = Date.now();

    await handlePatch(
      managed.database,
      this.appContext.embeddings,
      [{
        insertions: store.getQuads(null, null, null, null),
        deletions: [],
      }],
    );

    this.invalidateStore(namespace, slug);
    await this.worldsRepository.update(slug, namespace, {
      updated_at: now,
    });
  }

  /**
   * export retrieves a world's facts in the specified RDF content type.
   */
  async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    await this.ensureInitialized();
    const { world: slug, contentType } = input;
    const namespace = slug === WORLDS_WORLD_ID
      ? undefined as string | undefined
      : (undefined ?? undefined as string | undefined);
    const world = await this.worldsRepository.get(slug, namespace);
    if (!world) {
      throw new Error(`World not found: ${slug} in namespace ${namespace}`);
    }

    const serialization = contentType
      ? getSerializationByContentType(contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const store = await this.getStore(namespace, slug);
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

      const sd = "http://www.w3.org/ns/sparql-service-description#";
      const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
      const endpoint = namedNode(endpointUrl);
      const serviceType = namedNode(`${sd}Service`);
      const endpointProperty = namedNode(`${sd}endpoint`);

      writer.addQuad(quad(endpoint, namedNode(`${rdf}type`), serviceType));
      writer.addQuad(quad(endpoint, endpointProperty, endpoint));

      const supportedFormat = namedNode(`${sd}supportedFormat`);
      const jsonFormat = namedNode(
        "http://www.w3.org/ns/formats/SPARQL_Results_JSON",
      );
      const turtleFormat = namedNode(
        "http://www.w3.org/ns/formats/Turtle",
      );
      writer.addQuad(quad(endpoint, supportedFormat, jsonFormat));
      writer.addQuad(quad(endpoint, supportedFormat, turtleFormat));

      const supportedLanguage = namedNode(`${sd}supportedLanguage`);
      const sparql11Query = namedNode(`${sd}SPARQL11Query`);
      const sparql11Update = namedNode(`${sd}SPARQL11Update`);
      const sparql12Query = namedNode(`${sd}SPARQL12Query`);
      const sparql12Update = namedNode(`${sd}SPARQL12Update`);
      writer.addQuad(quad(endpoint, supportedLanguage, sparql11Query));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql11Update));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql12Query));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql12Update));

      const feature = namedNode(`${sd}feature`);
      const unionDefaultGraph = namedNode(`${sd}UnionDefaultGraph`);
      const dereferencesURIs = namedNode(`${sd}DereferencesURIs`);
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
    await this.appContext.libsql.manager.close();
    this.appContext.libsql.database.close();
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
   * ensureInitialized ensures that the registry world is initialized.
   */
  private async ensureInitialized(): Promise<void> {
    this.ensureNotClosed();
    if (!this.registryWorldInitialized) {
      await this.init();
    } else {
      await this.registryWorldInitialized;
    }
  }
}

