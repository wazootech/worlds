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
import { executeSparqlOutputSchema, logSchema, worldSchema } from "./schema.ts";
import type { WorldsInterface } from "./types.ts";
import type { WorldRow } from "./database/repositories/system/worlds/mod.ts";
import type { Patch } from "./rdf/patch/mod.ts";
import type { WorldsContext } from "./types.ts";
import type {
  CreateWorldParams,
  ExecuteSparqlOutput,
  Log,
  TripleSearchResult,
  UpdateWorldParams,
  World,
  WorldsContentType,
} from "./schema.ts";

const { namedNode, quad } = DataFactory;

/**
 * LocalWorlds is a server-side implementation of the Worlds interface.
 */
export class LocalWorlds implements WorldsInterface {
  private readonly worldsRepository: WorldsRepository;

  constructor(private readonly appContext: WorldsContext) {
    this.worldsRepository = new WorldsRepository(appContext.libsql.database);
  }

  /**
   * list paginates all available worlds from the system database.
   */
  async list(options?: {
    limit?: number;
    offset?: number;
    page?: number; // Convenience
    pageSize?: number; // Convenience
  }): Promise<World[]> {
    let limit = options?.limit ?? 20;
    let offset = options?.offset ?? 0;

    if (options?.page && options?.pageSize) {
      limit = options.pageSize;
      offset = (options.page - 1) * options.pageSize;
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
  async get(idOrSlug: string): Promise<World | null> {
    const world = await this.resolveWorld(idOrSlug);
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
  async create(data: CreateWorldParams): Promise<World> {
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
  async update(idOrSlug: string, data: UpdateWorldParams): Promise<void> {
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
  async delete(idOrSlug: string): Promise<void> {
    const world = await this.resolveWorld(idOrSlug);
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
  async sparql(
    idOrSlug: string,
    query: string,
    _options?: {
      defaultGraphUris?: string[];
      namedGraphUris?: string[];
    },
  ): Promise<ExecuteSparqlOutput> {
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

    return executeSparqlOutputSchema.parse(result);
  }

  /**
   * search performs semantic/text search on triples using vector embeddings.
   */
  async search(
    idOrSlug: string,
    query: string,
    options?: {
      limit?: number;
      subjects?: string[];
      predicates?: string[];
      types?: string[];
    },
  ): Promise<TripleSearchResult[]> {
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
      subjects: options?.subjects,
      predicates: options?.predicates,
      types: options?.types,
      limit: options?.limit ?? 20,
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
        subjects: options?.subjects?.length ? options.subjects : null,
        predicates: options?.predicates?.length ? options.predicates : null,
        types: options?.types?.length ? options.types : null,
      },
    });

    return results;
  }

  async import(
    idOrSlug: string,
    data: string | ArrayBuffer,
    options?: {
      contentType?: WorldsContentType;
    },
  ): Promise<void> {
    const world = await this.resolveWorld(idOrSlug);
    if (!world) {
      throw new Error("World not found");
    }

    const serialization = options?.contentType
      ? getSerializationByContentType(options.contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${options?.contentType}`);
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
  async export(
    idOrSlug: string,
    options?: { contentType?: WorldsContentType },
  ): Promise<ArrayBuffer> {
    const world = await this.resolveWorld(idOrSlug);
    if (!world) {
      throw new Error("World not found");
    }

    const serialization = options?.contentType
      ? getSerializationByContentType(options.contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${options?.contentType}`);
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
  getServiceDescription(
    _id: string,
    options: { endpointUrl: string; contentType?: WorldsContentType },
  ): Promise<string> {
    const serialization = options.contentType
      ? getSerializationByContentType(options.contentType)
      : DEFAULT_SERIALIZATION;
    if (!serialization) {
      throw new Error(`Unsupported content type: ${options.contentType}`);
    }

    return new Promise((resolve, reject) => {
      const writer = new Writer({ format: serialization.format });

      // SPARQL Service Description vocabulary
      const sd = "http://www.w3.org/ns/sparql-service-description#";
      const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
      const endpoint = namedNode(options.endpointUrl);
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
  async listLogs(
    idOrSlug: string,
    options?: {
      page?: number;
      pageSize?: number;
      level?: string;
    },
  ): Promise<Log[]> {
    const world = await this.resolveWorld(idOrSlug);
    if (!world) {
      throw new Error("World not found");
    }

    const managed = await this.appContext.libsql.manager.get(world.id);
    const logsRepository = new LogsRepository(managed.database);

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;

    const rows = await logsRepository.listByWorld(
      world.id,
      page,
      pageSize,
      options?.level,
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
}
