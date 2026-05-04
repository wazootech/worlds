import type { WorldsInterface } from "#/engine/service.ts";
import type { ApiKeyRepository } from "#/management/keys.ts";
import type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  ListWorldsResponse,
  SearchWorldsRequest,
  SearchWorldsResponse,
  SparqlQueryRequest,
  SparqlQueryResponse,
  UpdateWorldRequest,
  World,
} from "#/schema.ts";

/**
 * AuthorizedRequest is the result of a successful authentication.
 */
export interface AuthorizedRequest {
  admin: boolean;
  namespaceId?: string;
  worldId?: string;
}

/**
 * SecureWorldsOptions are the options for creating a SecureWorlds instance.
 */
export interface SecureWorldsOptions {
  worlds: WorldsInterface;
  apiKeyRepository: ApiKeyRepository;
  adminApiKey?: string;
}

/**
 * SecureWorlds wraps a WorldsInterface with server-side authentication.
 * Provides authorization based on API keys and namespace isolation.
 */
export class SecureWorlds implements WorldsInterface {
  private readonly worlds: WorldsInterface;
  private readonly apiKeyRepository: ApiKeyRepository;
  private readonly adminApiKey?: string;

  constructor(options: SecureWorldsOptions) {
    this.worlds = options.worlds;
    this.apiKeyRepository = options.apiKeyRepository;
    this.adminApiKey = options.adminApiKey;
  }

  /**
   * authorize checks request authorization and returns namespace info.
   * Admin key grants full access, API keys grant namespace-scoped access.
   */
  async authorize(request: Request): Promise<AuthorizedRequest> {
    if (!this.adminApiKey) {
      return { admin: true };
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { admin: false };
    }

    const apiKey = authHeader.slice("Bearer ".length).trim();

    if (this.adminApiKey && apiKey === this.adminApiKey) {
      return { admin: true };
    }

    const resolved = await this.apiKeyRepository.resolve(apiKey);

    if (resolved) {
      return {
        admin: false,
        namespaceId: resolved.namespace,
        worldId: resolved.worldId,
      };
    }

    return { admin: false };
  }

  public init(): Promise<void> {
    return this.worlds.init();
  }

  public [Symbol.asyncDispose](): Promise<void> {
    if (typeof this.worlds[Symbol.asyncDispose] === "function") {
      return this.worlds[Symbol.asyncDispose]();
    }
    return Promise.resolve();
  }

  public getWorld(input: GetWorldRequest): Promise<World | null> {
    return this.worlds.getWorld(input);
  }

  public createWorld(input: CreateWorldRequest): Promise<World> {
    return this.worlds.createWorld(input);
  }

  public updateWorld(input: UpdateWorldRequest): Promise<World> {
    return this.worlds.updateWorld(input);
  }

  public deleteWorld(input: DeleteWorldRequest): Promise<void> {
    return this.worlds.deleteWorld(input);
  }

  public listWorlds(
    input?: ListWorldsRequest,
  ): Promise<ListWorldsResponse> {
    return this.worlds.listWorlds(input);
  }

  public sparql(
    input: SparqlQueryRequest,
  ): Promise<SparqlQueryResponse> {
    return this.worlds.sparql(input);
  }

  public search(
    input: SearchWorldsRequest,
  ): Promise<SearchWorldsResponse> {
    return this.worlds.search(input);
  }

  public import(
    input: ImportWorldRequest,
  ): Promise<void> {
    return this.worlds.import(input);
  }

  public export(
    input: ExportWorldRequest,
  ): Promise<ArrayBuffer> {
    return this.worlds.export(input);
  }
}
