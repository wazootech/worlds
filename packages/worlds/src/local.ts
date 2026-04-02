import { ulid } from "@std/ulid/ulid";
import { DataFactory, Parser, Store, Writer } from "n3";
import { ChunksSearchRepository } from "./database/repositories/world/chunks/mod.ts";
import { WorldsRepository } from "./database/repositories/system/worlds/mod.ts";
import { BlobsRepository } from "./database/repositories/world/blobs/mod.ts";
import { LogsRepository } from "./database/repositories/world/logs/mod.ts";
import { BatchPatchHandler, handlePatch } from "./rdf/patch/mod.ts";
import { sparql } from "./rdf/sparql.ts";
import { isSparqlUpdate } from "./utils.ts";
import {
  DEFAULT_SERIALIZATION,
  getSerializationByContentType,
} from "./rdf/core/serialization.ts";
import {
  logSchema,
  worldSchema,
  worldsSparqlOutputSchema,
} from "./schemas/mod.ts";
import type { WorldsInterface } from "./types.ts";
import type { WorldRow } from "./database/repositories/system/worlds/mod.ts";
import type { Patch } from "./rdf/patch/mod.ts";
import type { WorldsContext } from "./types.ts";
import { KERNEL, KERNEL_WORLD_ID } from "./ontology.ts";
import type {
  Log,
  World,
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsExportInput,
  WorldsGetInput,
  WorldsImportInput,
  WorldsListInput,
  WorldsLogsInput,
  WorldsSearchInput,
  WorldsSearchOutput,
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
  WorldsUpdateInput,
} from "./schemas/mod.ts";

const { namedNode, quad } = DataFactory;

/**
 * LocalWorlds is a server-side implementation of the Worlds interface.
 */
export class LocalWorlds implements WorldsInterface {
  private readonly worldsRepository: WorldsRepository;
  private readonly kernelWorldInitialized: Promise<void>;

  constructor(private readonly appContext: WorldsContext) {
    this.worldsRepository = new WorldsRepository(appContext.libsql.database);
    this.kernelWorldInitialized = this.ensureKernelWorld();
  }

  /**
   * ensureKernelWorld guarantees the presence of the kernel world and seeds it if necessary.
   */
  private async ensureKernelWorld(): Promise<void> {
    const existing = await this.worldsRepository.getById(KERNEL_WORLD_ID);
    if (existing) {
      return;
    }

    const now = Date.now();
    try {
      await this.worldsRepository.insert({
        id: KERNEL_WORLD_ID,
        slug: "kernel",
        label: "Kernel",
        description: "Worlds platform control plane.",
        db_hostname: null,
        db_token: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      await this.appContext.libsql.manager.create(KERNEL_WORLD_ID);
    } catch (error) {
      // If another instance already initialized the kernel world, we can safe skip
      const checkAgain = await this.worldsRepository.getById(KERNEL_WORLD_ID);
      if (!checkAgain) {
        throw error;
      }
    }

    // Bootstrap if an API key is provided
    if (this.appContext.apiKey) {
      const orgId = this.appContext.organizationId ??
        `${KERNEL.BASE}organizations/root`;
      const keyId = `${KERNEL.BASE}keys/bootstrap`;

      await this._sparql({
        world: KERNEL_WORLD_ID,
        query: `
          PREFIX worlds: <${KERNEL.NAMESPACE}>
          INSERT DATA {
            <${orgId}> a <${KERNEL.Organization}> ;
              <${KERNEL.hasLabel}> "Root Organization" ;
              <${KERNEL.createdAt}> ${now} .
            
            <${keyId}> a <${KERNEL.ApiKey}> ;
              <${KERNEL.belongsTo}> <${orgId}> ;
              <${KERNEL.hasSecret}> "${this.appContext.apiKey}" ;
              <${KERNEL.createdAt}> ${now} .
          }
        `,
      });
    }
  }

  /**
   * list paginates all available worlds from the system database.
   */
  async list(input?: WorldsListInput): Promise<World[]> {
    await this.kernelWorldInitialized;
    let limit = 20;
    let offset = 0;

    if (input?.page && input?.pageSize) {
      limit = input.pageSize;
      offset = (input.page - 1) * input.pageSize;
    }

    const rows = await this.worldsRepository.list(limit, offset);
    return rows.map((world) =>
      worldSchema.parse({
        id: world.id,
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
   * get fetches a single world by its ID or slug.
   */
  async get(input: WorldsGetInput): Promise<World | null> {
    await this.kernelWorldInitialized;
    const world = await this.resolveWorld(input.world);
    if (!world) {
      return null;
    }

    return worldSchema.parse({
      id: world.id,
      slug: world.slug,
      label: world.label,
      description: world.description,
      createdAt: world.created_at,
      updatedAt: world.updated_at,
      deletedAt: world.deleted_at,
    });
  }

  /**
   * resolveWorld finds a world record by its ID or slug.
   */
  private async resolveWorld(idOrSlug: string): Promise<WorldRow | null> {
    const worldById = await this.worldsRepository.getById(idOrSlug);
    if (worldById && worldById.deleted_at === null) {
      return worldById;
    }

    const worldBySlug = await this.worldsRepository.getBySlug(idOrSlug);
    if (worldBySlug && worldBySlug.deleted_at === null) {
      return worldBySlug;
    }

    return null;
  }

  /**
   * create creates a new isolated world.
   */
  async create(data: WorldsCreateInput): Promise<World> {
    await this.kernelWorldInitialized;
    const id = ulid();
    const { slug, label, description } = data;

    const existingBySlug = await this.worldsRepository.getBySlug(slug);
    if (existingBySlug) {
      throw new Error("World slug already exists");
    }

    const now = Date.now();
    const worldRow = {
      id,
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
    await this.appContext.libsql.manager.create(id);

    return worldSchema.parse({
      id: worldRow.id,
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
    await this.kernelWorldInitialized;
    const { world: idOrSlug, ...data } = input;
    const world = await this.resolveWorld(idOrSlug);
    if (!world) {
      throw new Error("World not found");
    }

    await this.worldsRepository.update(world.id, {
      slug: data.slug ?? world.slug,
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
    await this.kernelWorldInitialized;
    const world = await this.resolveWorld(input.world);
    if (!world) {
      throw new Error("World not found");
    }

    await this.worldsRepository.update(world.id, {
      deleted_at: Date.now(),
    });
  }

  /**
   * sparql executes a SPARQL query or update against a specific world.
   */
  async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    await this.kernelWorldInitialized;
    return this._sparql(input);
  }

  /**
   * _sparql is the internal implementation that bypasses the initialization check.
   */
  private async _sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    const { world: idOrSlug, query } = input;
    const world = await this.resolveWorld(idOrSlug);
    if (!world) {
      throw new Error("World not found");
    }

    const managedWorld = await this.appContext.libsql.manager.get(world.id);
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
      await this.worldsRepository.update(world.id, { updated_at: updatedAt });

      const logsRepository = new LogsRepository(managedWorld.database);
      await logsRepository.add({
        id: ulid(),
        world_id: world.id,
        timestamp: Date.now(),
        level: "info",
        message: "SPARQL update",
        metadata: { query: query.slice(0, 1000) },
      });

      return null;
    }

    const logsRepository = new LogsRepository(managedWorld.database);
    await logsRepository.add({
      id: ulid(),
      world_id: world.id,
      timestamp: Date.now(),
      level: "info",
      message: "SPARQL query",
      metadata: { query: query.slice(0, 1000) },
    });

    return worldsSparqlOutputSchema.parse(result);
  }

  /**
   * search performs semantic/text search on triples using vector embeddings.
   */
  async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    await this.kernelWorldInitialized;
    const { world: idOrSlug, query, limit, subjects, predicates, types } =
      input;
    const world = await this.resolveWorld(idOrSlug);
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

    const managed = await this.appContext.libsql.manager.get(world.id);
    const logsRepository = new LogsRepository(managed.database);
    await logsRepository.add({
      id: ulid(),
      world_id: world.id,
      timestamp: Date.now(),
      level: "info",
      message: "Semantic search executed",
      metadata: {
        query: query.slice(0, 500),
        subjects: subjects?.length ? subjects : null,
        predicates: predicates?.length ? predicates : null,
        types: types?.length ? types : null,
      },
    });

    return results;
  }

  async import(input: WorldsImportInput): Promise<void> {
    await this.kernelWorldInitialized;
    const { world: idOrSlug, data, contentType } = input;
    const world = await this.resolveWorld(idOrSlug);
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
          const managed = await this.appContext.libsql.manager.get(world.id);
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
          await this.worldsRepository.update(world.id, { updated_at: now });

          const logsRepository = new LogsRepository(managed.database);
          await logsRepository.add({
            id: ulid(),
            world_id: world.id,
            timestamp: now,
            level: "info",
            message: "World data imported",
            metadata: { triples: store.size },
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
    await this.kernelWorldInitialized;
    const { world: idOrSlug, contentType } = input;
    const world = await this.resolveWorld(idOrSlug);
    if (!world) {
      throw new Error("World not found");
    }

    const serialization = contentType
      ? getSerializationByContentType(contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const managed = await this.appContext.libsql.manager.get(world.id);
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
   * listLogs retrieves execution and audit logs from the world database.
   */
  async listLogs(input: WorldsLogsInput): Promise<Log[]> {
    await this.kernelWorldInitialized;
    const { world: idOrSlug, page: p, pageSize: ps, level } = input;
    const world = await this.resolveWorld(idOrSlug);
    if (!world) {
      throw new Error("World not found");
    }

    const managed = await this.appContext.libsql.manager.get(world.id);
    const logsRepository = new LogsRepository(managed.database);

    const page = p ?? 1;
    const pageSize = ps ?? 20;

    const rows = await logsRepository.listByWorld(
      world.id,
      page,
      pageSize,
      level,
    );

    const results = rows.map((log) =>
      logSchema.parse({
        id: log.id,
        worldId: log.world_id,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        metadata: log.metadata,
      })
    );
    return results;
  }

  /**
   * close shuts down the engine and all managed database connections.
   */
  async close(): Promise<void> {
    await this.kernelWorldInitialized;
    await this.appContext.libsql.manager.close();
  }
}
