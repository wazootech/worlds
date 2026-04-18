import { ulid } from "@std/ulid";
import type { WorldsContext, WorldsInterface } from "#/types.ts";
import { resolveNamespace, resolveWorldId, toWorldName } from "#/sources.ts";
import { FactsRepository } from "#/worlds/facts/repository.ts";
import { ChunksSearchRepository } from "#/worlds/chunks/repository.ts";
import type {
  World,
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsGetInput,
  WorldsUpdateInput,
} from "#/worlds/schema.ts";
import type {
  WorldsExportInput,
  WorldsImportInput,
  WorldsListInput,
} from "#/schema.ts";
import type {
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
} from "#/worlds/sparql.schema.ts";
import type {
  WorldsSearchInput,
  WorldsSearchOutput,
} from "#/worlds/search.schema.ts";

/**
 * LocalWorlds is the server-side implementation of the Worlds API.
 * It coordinates domain logic across Map-backed repositories and storage.
 */
export class LocalWorlds implements WorldsInterface {
  constructor(private readonly ctx: WorldsContext) {}

  /**
   * list paginates all available worlds.
   */
  public async list(input?: WorldsListInput): Promise<World[]> {
    const namespace = input?.namespace ?? this.ctx.namespace ?? undefined;
    const result = await this.ctx.worlds.list({
      namespace,
      pageSize: input?.pageSize,
      pageToken: input?.pageToken,
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
   * get fetches a single world by its ID or source name.
   */
  public async get(input: WorldsGetInput): Promise<World | null> {
    const source = typeof input.source === "string"
      ? input.source
      : input.source.name;
    const worldId = resolveWorldId(source);
    const namespace = resolveNamespace(source, this.ctx.namespace);

    const row = await this.ctx.worlds.get(
      worldId ?? undefined,
      namespace ?? undefined,
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
    const source = input.name;
    const worldId = resolveWorldId(source) ?? ulid();
    const namespace = resolveNamespace(source, this.ctx.namespace);

    const now = Date.now();
    const row = {
      id: worldId,
      namespace: namespace ?? undefined,
      label: input.label ?? "",
      description: input.description ?? undefined,
      connection_uri: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await this.ctx.worlds.insert(row);
    // Ensure storage is initialized for this world
    await this.ctx.storage.create({
      id: worldId,
      namespace: namespace ?? undefined,
    });

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
   * update modifies world metadata.
   */
  public async update(input: WorldsUpdateInput): Promise<void> {
    const source = typeof input.source === "string"
      ? input.source
      : input.source.name;
    const worldId = resolveWorldId(source);
    const namespace = resolveNamespace(source, this.ctx.namespace);

    await this.ctx.worlds.update(worldId ?? undefined, namespace ?? undefined, {
      label: input.label ?? undefined,
      description: input.description ?? undefined,
      updated_at: Date.now(),
    });
  }

  /**
   * delete removes a world record and its storage.
   */
  public async delete(input: WorldsDeleteInput): Promise<void> {
    const source = typeof input.source === "string"
      ? input.source
      : input.source.name;
    const worldId = resolveWorldId(source);
    const namespace = resolveNamespace(source, this.ctx.namespace);

    await this.ctx.worlds.delete(worldId ?? undefined, namespace ?? undefined);
    await this.ctx.storage.delete({
      id: worldId ?? undefined,
      namespace: namespace ?? undefined,
    });
  }

  /**
   * sparql executes a SPARQL query against a world.
   */
  public async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    const sourceInput = input.sources?.[0] ?? "";
    const source = typeof sourceInput === "string"
      ? sourceInput
      : sourceInput.name;
    const worldId = resolveWorldId(source);
    const namespace = resolveNamespace(
      source,
      input.namespace ?? this.ctx.namespace,
    );

    const storage = await this.ctx.storage.get({
      id: worldId ?? undefined,
      namespace: namespace ?? undefined,
    });
    const facts = new FactsRepository(storage);
    return await facts.query(input.query) as WorldsSparqlOutput;
  }

  /**
   * search finds chunks in the world using vector similarity.
   */
  public async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    const searcher = new ChunksSearchRepository(this.ctx);
    return await searcher.search({
      query: input.query,
      limit: input.limit,
      namespace: input.namespace ?? this.ctx.namespace,
    });
  }

  /**
   * import loads data into a world.
   */
  public async import(input: WorldsImportInput): Promise<void> {
    const sourceInput = input.source;
    const source = typeof sourceInput === "string"
      ? sourceInput
      : sourceInput.name;
    const worldId = resolveWorldId(source);
    const namespace = resolveNamespace(source, this.ctx.namespace);

    const storage = await this.ctx.storage.get({
      id: worldId ?? undefined,
      namespace: namespace ?? undefined,
    });
    const facts = new FactsRepository(storage);
    const importData = input.data instanceof ArrayBuffer
      ? new Uint8Array(input.data)
      : input.data;
    await facts.import(importData, input.contentType ?? "application/n-quads");
  }

  /**
   * export retrieves data from a world.
   */
  public async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    const sourceInput = input.source;
    const source = typeof sourceInput === "string"
      ? sourceInput
      : sourceInput.name;
    const worldId = resolveWorldId(source);
    const namespace = resolveNamespace(source, this.ctx.namespace);

    const storage = await this.ctx.storage.get({
      id: worldId ?? undefined,
      namespace: namespace ?? undefined,
    });
    const facts = new FactsRepository(storage);
    return await facts.export(input.contentType);
  }

  /**
   * getServiceDescription retrieves the SPARQL service description.
   */
  public getServiceDescription(
    _input: WorldsServiceDescriptionInput,
  ): Promise<string> {
    return "SPARQL 1.1 Service Description (Map-based Worlds Engine)";
  }

  /**
   * init initializes the engine.
   */
  public init(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * close shuts down the engine and its storage.
   */
  public async close(): Promise<void> {
    await this.ctx.storage.close();
  }

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  public async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
