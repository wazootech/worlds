import { DataFactory, Parser, Store, Writer } from "n3";

import { ChunksSearchRepository } from "#/world/chunks/repository.ts";
import { WorldsRepository } from "#/plugins/registry/worlds.repository.ts";
import { BlobsRepository } from "#/world/blobs/repository.ts";

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
  REGISTRY,
  REGISTRY_NAMESPACE_ID,
  REGISTRY_WORLD_ID,
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
 */
export class LocalWorlds implements WorldsInterface {
  private readonly worldsRepository: WorldsRepository;
  private registryWorldInitialized?: Promise<void>;
  private isClosed = false;

  constructor(private readonly appContext: WorldsContext) {
    this.worldsRepository = new WorldsRepository(appContext.libsql.database);
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
      REGISTRY_WORLD_ID,
      REGISTRY_NAMESPACE_ID,
    );
    if (existing) {
      return;
    }

    const now = Date.now();
    try {
      await this.worldsRepository.insert({
        namespace_id: REGISTRY_NAMESPACE_ID,
        slug: REGISTRY_WORLD_ID,
        label: "Registry",
        description: "Worlds platform registry and control plane.",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      await this.appContext.libsql.manager.create(
        REGISTRY_NAMESPACE_ID,
        REGISTRY_WORLD_ID,
      );
    } catch (error) {
      // If another instance already initialized the registry world, we can safe skip
      const checkAgain = await this.worldsRepository.get(
        REGISTRY_WORLD_ID,
        REGISTRY_NAMESPACE_ID,
      );
      if (!checkAgain) {
        throw error;
      }
    }

    // Bootstrap if an API key is provided
    if (this.appContext.apiKey) {
      const namespaceId = this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID;
      const keyId = `${REGISTRY.BASE}keys/bootstrap`;

      await this._sparql({
        world: REGISTRY_WORLD_ID,
        query: `
          PREFIX registry: <${REGISTRY.NAMESPACE}>
          INSERT DATA {
            <${namespaceId}> a <${REGISTRY.Namespace}> ;
              <${REGISTRY.hasLabel}> "Root Namespace" ;
              <${REGISTRY.createdAt}> ${now} .
            
            <${keyId}> a <${REGISTRY.ApiKey}> ;
              <${REGISTRY.belongsTo}> <${namespaceId}> ;
              <${REGISTRY.hasSecret}> "${this.appContext.apiKey}" ;
              <${REGISTRY.createdAt}> ${now} .
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

    const namespaceId = this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID;
    const rows = await this.worldsRepository.list(namespaceId, limit, offset);
    return rows.map((world) =>
      worldSchema.parse({
        id: world.slug, // ID is now the slug
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
    const namespaceId = input.world === REGISTRY_WORLD_ID
      ? REGISTRY_NAMESPACE_ID
      : (this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID);
    const world = await this.worldsRepository.get(input.world, namespaceId);
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
    const { slug, label, description } = data;

    const namespaceId = this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID;
    const existingBySlug = await this.worldsRepository.get(
      slug,
      namespaceId,
    );
    if (existingBySlug) {
      throw new Error("World slug already exists");
    }

    const now = Date.now();
    const worldRow = {
      namespace_id: namespaceId,
      slug,
      label,
      description: description ?? null,
      db_hostname: null,
      db_token: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await this.worldsRepository.insert(worldRow);
    await this.appContext.libsql.manager.create(namespaceId, slug);

    return worldSchema.parse({
      id: worldRow.slug,
      slug: worldRow.slug,
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
    const { world: slug, ...data } = input;
    const namespaceId = slug === REGISTRY_WORLD_ID
      ? REGISTRY_NAMESPACE_ID
      : (this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID);
    const world = await this.worldsRepository.get(slug, namespaceId);
    if (!world) {
      throw new Error("World not found");
    }

    await this.worldsRepository.update(slug, namespaceId, {
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
    const namespaceId = input.world === REGISTRY_WORLD_ID
      ? REGISTRY_NAMESPACE_ID
      : (this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID);
    const world = await this.worldsRepository.get(input.world, namespaceId);
    if (!world) {
      throw new Error("World not found");
    }

    await this.worldsRepository.update(input.world, namespaceId, {
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
    const namespaceId = slug === REGISTRY_WORLD_ID
      ? REGISTRY_NAMESPACE_ID
      : (this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID);
    const world = await this.worldsRepository.get(slug, namespaceId);
    if (!world) {
      throw new Error(`World not found: ${slug} in namespace ${namespaceId}`);
    }

    const managedWorld = await this.appContext.libsql.manager.get(
      namespaceId,
      slug,
    );
    const patchHandler = new BatchPatchHandler({
      patch: (patches: Patch[]) =>
        handlePatch(managedWorld.database, this.appContext.embeddings, patches),
    });

    const blobsRepository = new BlobsRepository(managedWorld.database);
    const worldData = await blobsRepository.get();
    const blobData = worldData?.blob as unknown as ArrayBuffer;
    const blob = blobData
      ? new Blob([new Uint8Array(blobData)])
      : new Blob([], { type: "application/n-quads" });

    const isUpdate = await isSparqlUpdate(query);
    const { blob: newBlob, result } = await sparql(blob, query, patchHandler);

    if (isUpdate) {
      const newData = new Uint8Array(await newBlob.arrayBuffer());
      await patchHandler.commit();

      const updatedAt = Date.now();
      await blobsRepository.set(newData, updatedAt);
      await this.worldsRepository.update(slug, namespaceId, {
        updated_at: updatedAt,
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
    const namespaceId = slug === REGISTRY_WORLD_ID
      ? REGISTRY_NAMESPACE_ID
      : (this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID);
    const world = await this.worldsRepository.get(slug, namespaceId);
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
    const namespaceId = slug === REGISTRY_WORLD_ID
      ? REGISTRY_NAMESPACE_ID
      : (this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID);
    const world = await this.worldsRepository.get(slug, namespaceId);
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

    const writer = new Writer({ format: "N-Quads" });
    writer.addQuads(store.getQuads(null, null, null, null));

    return new Promise((resolve, reject) => {
      writer.end(async (error: Error | null, result: string | undefined) => {
        if (error) {
          reject(error);
          return;
        }
        try {
          const managed = await this.appContext.libsql.manager.get(
            namespaceId,
            slug,
          );
          const blobsRepository = new BlobsRepository(managed.database);
          const now = Date.now();

          await handlePatch(
            managed.database,
            this.appContext.embeddings,
            [{
              insertions: store.getQuads(null, null, null, null),
              deletions: [],
            }],
          );

          await blobsRepository.set(new TextEncoder().encode(result), now);
          await this.worldsRepository.update(slug, namespaceId, {
            updated_at: now,
          });

          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
   * export retrieves a world's facts in the specified RDF content type.
   */
  async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    await this.ensureInitialized();
    const { world: slug, contentType } = input;
    const namespaceId = slug === REGISTRY_WORLD_ID
      ? REGISTRY_NAMESPACE_ID
      : (this.appContext.namespaceId ?? REGISTRY_NAMESPACE_ID);
    const world = await this.worldsRepository.get(slug, namespaceId);
    if (!world) {
      throw new Error(`World not found: ${slug} in namespace ${namespaceId}`);
    }

    const serialization = contentType
      ? getSerializationByContentType(contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const managed = await this.appContext.libsql.manager.get(namespaceId, slug);
    const blobsRepository = new BlobsRepository(managed.database);
    const worldData = await blobsRepository.get();

    if (!worldData) {
      return new ArrayBuffer(0);
    }

    const blobData = worldData.blob as unknown as ArrayBuffer;
    if (serialization.format === DEFAULT_SERIALIZATION.format) {
      return blobData;
    }

    const quads = new TextDecoder().decode(blobData);
    const parser = new Parser({ format: "N-Quads" });
    const store = new Store();
    store.addQuads(parser.parse(quads));

    const writer = new Writer({ format: serialization.format });
    writer.addQuads(store.getQuads(null, null, null, null));

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

      // SPARQL Service Description vocabulary
      const sd = "http://www.w3.org/ns/sparql-service-description#";
      const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
      const endpoint = namedNode(endpointUrl);
      const serviceType = namedNode(`${sd}Service`);
      const endpointProperty = namedNode(`${sd}endpoint`);

      // Required triples
      writer.addQuad(quad(endpoint, namedNode(`${rdf}type`), serviceType));
      writer.addQuad(quad(endpoint, endpointProperty, endpoint));

      // Advertise supported formats
      const supportedFormat = namedNode(`${sd}supportedFormat`);
      const jsonFormat = namedNode(
        "http://www.w3.org/ns/formats/SPARQL_Results_JSON",
      );
      const turtleFormat = namedNode(
        "http://www.w3.org/ns/formats/Turtle",
      );
      writer.addQuad(quad(endpoint, supportedFormat, jsonFormat));
      writer.addQuad(quad(endpoint, supportedFormat, turtleFormat));

      // Advertise supported languages
      const supportedLanguage = namedNode(`${sd}supportedLanguage`);
      const sparql11Query = namedNode(`${sd}SPARQL11Query`);
      const sparql11Update = namedNode(`${sd}SPARQL11Update`);
      const sparql12Query = namedNode(`${sd}SPARQL12Query`);
      const sparql12Update = namedNode(`${sd}SPARQL12Update`);
      writer.addQuad(quad(endpoint, supportedLanguage, sparql11Query));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql11Update));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql12Query));
      writer.addQuad(quad(endpoint, supportedLanguage, sparql12Update));

      // Advertise features
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

