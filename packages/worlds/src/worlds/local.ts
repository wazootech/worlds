import type { Client } from "@libsql/client";
import type {
  World,
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsGetInput,
  WorldsUpdateInput,
} from "#/schemas/world.ts";
import type {
  WorldsExportInput,
  WorldsImportInput,
  WorldsListInput,
  WorldsQueryInput,
} from "#/schemas/source.ts";
import type {
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
} from "#/schemas/sparql.ts";
import type {
  WorldsSearchInput,
  WorldsSearchOutput,
} from "#/schemas/search.ts";
import { WorldsRepository } from "#/plugins/system/worlds.repository.ts";
import { ApiKeysRepository } from "#/plugins/system/api-keys.repository.ts";
import { NamespacesRepository } from "#/plugins/system/namespaces.repository.ts";
import type { WorldOptions, WorldsStorage } from "#/storage/types.ts";
import type { WorldsContext } from "#/core/types.ts";
import { resolveSource, toWorldName } from "#/core/sources.ts";
import type { WorldRow } from "#/plugins/system/worlds.schema.ts";
import { ChunksRepository } from "../world/chunks/repository.ts";
import { ChunksSearchRepository } from "../world/chunks/repository.ts";
import { TriplesRepository } from "../world/triples/repository.ts";

/**
 * LocalWorlds implements the Worlds interface for a local deployment.
 * It manages world lifecycle, storage, and identity resolution.
 */
export class LocalWorlds implements AsyncDisposable {
  private initialized = false;
  private registry!: Client;
  private worldsRepository!: WorldsRepository;
  private apiKeysRepository!: ApiKeysRepository;
  private namespacesRepository!: NamespacesRepository;

  /**
   * constructor initializes LocalWorlds with a context.
   * @param appContext The application context.
   */
  constructor(private readonly appContext: WorldsContext) {}

  /**
   * init bootstraps the local worlds environment.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Initialize registry database.
    this.registry = this.appContext.system;
    this.worldsRepository = new WorldsRepository(this.registry);
    this.apiKeysRepository = new ApiKeysRepository(this.registry);
    this.namespacesRepository = new NamespacesRepository(this.registry);

    // Bootstrap registry tables if necessary.
    await this.ensureRegistry();

    this.initialized = true;
  }

  /**
   * ensureInitialized throws if the engine hasn't been initialized.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * ensureRegistry applies the base schema and default admin keys.
   */
  private async ensureRegistry(): Promise<void> {
    const { apiKey } = this.appContext;
    if (apiKey) {
      // Seed the admin API key for the root namespace.
      await this.apiKeysRepository.create(apiKey, undefined);
    }
  }

  /**
   * resolveNamespace find the namespace associated with an API key.
   * @param apiKey The API key to resolve.
   * @returns The namespace ID or undefined for the root namespace.
   */
  async resolveNamespace(apiKey: string): Promise<string | undefined | null> {
    await this.ensureInitialized();
    return this.apiKeysRepository.resolveNamespace(apiKey);
  }

  /**
   * authorizeRequest validates an API key and ensures it has access to the target namespace.
   * @param apiKey The API key secret.
   * @param targetNamespace The namespace ID being accessed.
   * @throws Error if authorization fails.
   */
  async authorizeRequest(
    apiKey: string | undefined,
    targetNamespace: string | undefined,
  ): Promise<void> {
    await this.ensureInitialized();
    if (!apiKey) {
      throw new Error("Authorization header is missing");
    }

    const authorizedNamespace = await this.resolveNamespace(apiKey);
    if (authorizedNamespace === null) {
      throw new Error("Invalid API key");
    }

    // Root keys (authorizedNamespace === undefined) can access everything.
    if (
      authorizedNamespace !== undefined &&
      authorizedNamespace !== targetNamespace
    ) {
      throw new Error(
        `API key is not authorized for namespace: ${targetNamespace}`,
      );
    }
  }

  /**
   * assertSourceAuthorized combines resolution and authorization for a target world.
   */
  private assertSourceAuthorized(
    _world: string | undefined,
    namespace: string | undefined,
  ): void {
    // Current implementation: check if the context namespace matches the source namespace.
    // In a production environment, this would integrate with resolveNamespace/authorizeRequest.
    if (namespace !== this.appContext.namespace) {
      // If we are not the admin namespace (undefined), we are isolated.
      if (this.appContext.namespace !== undefined) {
        throw new Error(
          `Unauthorized access to namespace: ${namespace ?? "default"}`,
        );
      }
    }
  }

  /**
   * create registers a new world in the registry.
   */
  async create(input: WorldsCreateInput): Promise<World> {
    await this.ensureInitialized();
    const { name, label, description } = input;

    if (!name) {
      throw new Error("name is required");
    }

    const { world: sourceId, namespace } = resolveSource(
      name,
      { namespace: this.appContext.namespace },
    );

    if (!sourceId) {
      throw new Error("Invalid world identifier");
    }

    this.assertSourceAuthorized(sourceId, namespace);

    const existing = await this.worldsRepository.get(sourceId, namespace);
    if (existing) {
      throw new Error(
        `World already exists: ${
          toWorldName({
            world: sourceId,
            namespace,
          })
        }`,
      );
    }

    await this.worldsRepository.insert({
      namespace,
      id: sourceId,
      label: label ?? "",
      description,
      db_hostname: null,
      db_token: null,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
    });

    return (await this.get({ source: name }))!;
  }

  /**
   * get retrieves world metadata.
   */
  async get(input: WorldsGetInput): Promise<World | null> {
    await this.ensureInitialized();
    const { world: sourceWorld, namespace } = resolveSource(
      input.source,
      { namespace: this.appContext.namespace },
    );

    this.assertSourceAuthorized(sourceWorld, namespace);

    const row = await this.worldsRepository.get(sourceWorld, namespace);
    if (!row) return null;

    return {
      name: toWorldName({ world: row.id, namespace: row.namespace }),
      label: row.label,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * list retrieves worlds matching the criteria.
   */
  async list(input: WorldsListInput = {}): Promise<World[]> {
    await this.ensureInitialized();
    const { namespace = this.appContext.namespace, pageSize = 10, pageToken } =
      input;

    // Authorization check for namespace listing.
    if (
      namespace !== this.appContext.namespace &&
      this.appContext.namespace !== undefined
    ) {
      throw new Error(`Unauthorized access to namespace: ${namespace}`);
    }

    const result = await this.worldsRepository.list({
      namespace,
      pageSize,
      pageToken,
    });
    return result.worlds.map((row) => ({
      name: toWorldName({ world: row.id, namespace: row.namespace }),
      label: row.label,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * update modifies world metadata.
   */
  async update(input: WorldsUpdateInput): Promise<void> {
    await this.ensureInitialized();
    const { source, label, description } = input;
    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );

    this.assertSourceAuthorized(sourceWorld, namespace);

    await this.worldsRepository.update(sourceWorld, namespace, {
      label,
      description,
      updated_at: Date.now(),
    });
  }

  /**
   * delete removes a world record.
   */
  async delete(input: WorldsDeleteInput): Promise<void> {
    await this.ensureInitialized();
    const { world: sourceWorld, namespace } = resolveSource(
      input.source,
      { namespace: this.appContext.namespace },
    );

    this.assertSourceAuthorized(sourceWorld, namespace);

    await this.worldsRepository.delete(sourceWorld, namespace);
  }

  /**
   * query executes a SPARQL query against a world.
   */
  async query(input: WorldsQueryInput): Promise<unknown> {
    await this.ensureInitialized();
    const { source, query } = input;
    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );

    this.assertSourceAuthorized(sourceWorld, namespace);

    const world = await this.getInternal(sourceWorld, namespace);
    const triples = new TriplesRepository(world);
    return triples.query(query);
  }

  /**
   * search finds chunks in the world using vector similarity.
   */
  async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    await this.ensureInitialized();
    const { query, limit = 10, sources, namespace: inputNamespace } = input;

    // Handle single source vs discovery search.
    const namespace = inputNamespace ?? this.appContext.namespace;

    let targetWorlds: WorldRow[] = [];
    if (!sources || sources.length === 0) {
      // Search across all worlds in the namespace.
      const result = await this.worldsRepository.list({
        namespace,
        pageSize: 100,
      });
      targetWorlds = result.worlds;
    } else {
      const worldPromises = sources.map((s) => {
        const parsed = resolveSource(s, { namespace });
        this.assertSourceAuthorized(parsed.world, parsed.namespace);
        return this.worldsRepository.get(
          parsed.world,
          parsed.namespace,
        );
      });
      const results = await Promise.all(worldPromises);
      targetWorlds = results.filter((w): w is WorldRow => w !== null);
    }

    const searchRepo = new ChunksSearchRepository(
      this.appContext,
      this.worldsRepository,
    );

    return searchRepo.search({
      query,
      limit,
      worlds: targetWorlds,
    });
  }

  /**
   * triples returns a TriplesRepository for a specific world.
   */
  async triples(source: string): Promise<TriplesRepository> {
    await this.ensureInitialized();
    const { world, namespace } = resolveSource(source, {
      namespace: this.appContext.namespace,
    });

    this.assertSourceAuthorized(world, namespace);

    const client = await this.getInternal(world, namespace);
    return new TriplesRepository(client);
  }

  /**
   * chunks returns a ChunksRepository for a specific world.
   */
  async chunks(source: string): Promise<ChunksRepository> {
    await this.ensureInitialized();
    const { world, namespace } = resolveSource(source, {
      namespace: this.appContext.namespace,
    });

    this.assertSourceAuthorized(world, namespace);

    const client = await this.getInternal(world, namespace);
    return new ChunksRepository(client);
  }

  /**
   * import loads data into a world.
   */
  async import(input: WorldsImportInput): Promise<void> {
    await this.ensureInitialized();
    const { source, data, contentType } = input;
    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );

    this.assertSourceAuthorized(sourceWorld, namespace);

    const world = await this.getInternal(sourceWorld, namespace);
    const triples = new TriplesRepository(world);
    const importData = typeof data === "string" ? data : new Uint8Array(data);
    await triples.import(importData, contentType ?? "application/n-quads");
  }

  /**
   * export retrieves data from a world.
   */
  async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    await this.ensureInitialized();
    const { source, contentType } = input;
    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );

    this.assertSourceAuthorized(sourceWorld, namespace);

    const world = await this.getInternal(sourceWorld, namespace);
    const triples = new TriplesRepository(world);
    const n3 = await triples.export(contentType);
    return n3;
  }

  /**
   * getInternal provides direct access to the storage client for a world.
   */
  private async getInternal(
    world?: string,
    namespace?: string,
  ): Promise<Client> {
    const worldRow = await this.worldsRepository.get(world, namespace);

    if (!worldRow) {
      throw new Error(
        `World not found: ${
          toWorldName({
            world,
            namespace,
          })
        }`,
      );
    }

    const options: WorldOptions = {
      id: worldRow.id,
      namespace: worldRow.namespace,
    };

    const storage = await this.appContext.storage.get(options);
    return storage.database;
  }

  /**
   * close releases all resources.
   */
  async close(): Promise<void> {
    // Current implementation uses :memory: or shared clients, so no explicit teardown is needed for the registry Client.
  }

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  public async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  /**
   * dispose is a synchronous alias for close (if applicable).
   */
  dispose(): void {
    // No-op for now.
  }

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    await this.ensureInitialized();
    const { sources, query } = input;

    const sourceArray = Array.isArray(sources) ? sources : [sources];
    if (sourceArray.length === 0) {
      throw new Error("At least one source is required for SPARQL operations");
    }

    const source = sourceArray[0];
    if (!source) {
      throw new Error("Source is required for SPARQL operations");
    }

    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );

    this.assertSourceAuthorized(sourceWorld, namespace);

    const world = await this.getInternal(sourceWorld, namespace);
    const triples = new TriplesRepository(world);
    const result = await triples.query(query);

    return result as WorldsSparqlOutput;
  }

  /**
   * getServiceDescription retrieves the SPARQL service description.
   */
  async getServiceDescription(
    input: WorldsServiceDescriptionInput,
  ): Promise<string> {
    await this.ensureInitialized();
    const { sources, contentType } = input;

    if (!sources || sources.length === 0) {
      throw new Error(
        "At least one source is required for service description",
      );
    }

    const source = sources[0];
    if (!source) {
      throw new Error("Source is required for service description");
    }

    const { world: sourceWorld, namespace } = resolveSource(
      source,
      { namespace: this.appContext.namespace },
    );

    this.assertSourceAuthorized(sourceWorld, namespace);

    const world = await this.getInternal(sourceWorld, namespace);
    const triples = new TriplesRepository(world);
    const data = await triples.export(contentType ?? "application/n-quads");
    return new TextDecoder().decode(data);
  }
}
