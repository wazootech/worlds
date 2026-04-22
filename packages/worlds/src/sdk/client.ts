import type { WorldsManagement, WorldsOptions } from "../engine/factory.ts";
import { parseError } from "../utils.ts";
import { encodeBase64 } from "@std/encoding/base64";
import type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetServiceDescriptionRequest,
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
} from "../schema.ts";

/**
 * RemoteWorldsManagement handles the management plane (lifecycle) of worlds via RPC.
 */
export class RemoteWorldsManagement implements WorldsManagement {
  constructor(private readonly client: WorldsClient) {}

  /**
   * listWorlds paginates all worlds.
   */
  public async listWorlds(
    input?: ListWorldsRequest,
  ): Promise<ListWorldsResponse> {
    return await this.client.callRpc<ListWorldsResponse>("list", input ?? {});
  }

  /**
   * getWorld fetches a single world.
   */
  public async getWorld(input: GetWorldRequest): Promise<World | null> {
    try {
      return await this.client.callRpc<World>("get", input);
    } catch (error) {
      if (
        error && typeof error === "object" &&
        "status" in error &&
        (error as { status: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * createWorld creates a new world.
   */
  public async createWorld(input: CreateWorldRequest): Promise<World> {
    return await this.client.callRpc<World>("create", input);
  }

  /**
   * updateWorld updates world metadata.
   */
  public async updateWorld(input: UpdateWorldRequest): Promise<World> {
    return await this.client.callRpc<World>("update", input);
  }

  /**
   * deleteWorld deletes a world.
   */
  public async deleteWorld(input: DeleteWorldRequest): Promise<void> {
    return await this.client.callRpc<void>("delete", input);
  }
}

/**
 * RemoteWorlds handles the data plane (knowledge) of worlds via RPC.
 */
export class RemoteWorlds {
  constructor(private readonly client: WorldsClient) {}

  /**
   * querySparql executes a SPARQL query.
   */
  public async querySparql(
    input: SparqlQueryRequest,
  ): Promise<SparqlQueryResponse> {
    return await this.client.callRpc<SparqlQueryResponse>(
      "querySparql",
      input,
      {
        accept: "application/sparql-results+json",
      },
    );
  }

  /**
   * sparql executes a SPARQL query (legacy alias for querySparql).
   */
  public async sparql(input: SparqlQueryRequest): Promise<SparqlQueryResponse> {
    return this.querySparql(input);
  }

  /**
   * searchWorlds performs semantic/text search using vector embeddings.
   */
  public async searchWorlds(
    input: SearchWorldsRequest,
  ): Promise<SearchWorldsResponse> {
    return await this.client.callRpc<SearchWorldsResponse>(
      "searchWorlds",
      input,
    );
  }

  /**
   * search performs semantic/text search (legacy alias for searchWorlds).
   */
  public async search(
    input: SearchWorldsRequest,
  ): Promise<SearchWorldsResponse> {
    return this.searchWorlds(input);
  }

  /**
   * importData ingests RDF data into a world.
   */
  public async importData(input: ImportWorldRequest): Promise<void> {
    const { data, contentType = "application/n-quads" } = input;
    const binaryData = typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data);

    const base64Data = encodeBase64(binaryData);
    return await this.client.callRpc<void>("importData", {
      ...input,
      data: base64Data,
      contentType,
    });
  }

  /**
   * import ingests RDF data (legacy alias for importData).
   */
  public async import(input: ImportWorldRequest): Promise<void> {
    return this.importData(input);
  }

  /**
   * exportData exports a world in the specified RDF content type.
   */
  public async exportData(input: ExportWorldRequest): Promise<ArrayBuffer> {
    return await this.client.callRpc<ArrayBuffer>("exportData", input, {
      responseType: "arrayBuffer",
    });
  }

  /**
   * export exports a world (legacy alias for exportData).
   */
  public async export(input: ExportWorldRequest): Promise<ArrayBuffer> {
    return this.exportData(input);
  }
}

/**
 * WorldsClient is a TypeScript SDK client for the Worlds API.
 */
export class WorldsClient {
  private readonly fetch: typeof fetch;

  /**
   * management provides handles for metadata operations.
   */
  public readonly management: RemoteWorldsManagement;

  /**
   * worlds provides handles for data-plane operations.
   */
  public readonly worlds: RemoteWorlds;

  /**
   * WorldsClient initializes the TypeScript SDK client.
   */
  public constructor(
    private readonly options: WorldsOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.management = new RemoteWorldsManagement(this);
    this.worlds = new RemoteWorlds(this);
  }

  /**
   * callRpc executes a unified RPC call.
   * @internal
   */
  public async callRpc<T, P = unknown>(
    action: string,
    params: P,
    options: {
      accept?: string;
      responseType?: "json" | "text" | "arrayBuffer";
    } = {},
  ): Promise<T> {
    const url = new URL(`${this.options.baseUrl}/rpc`);
    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
        ...(options.accept ? { "Accept": options.accept } : {}),
      },
      body: JSON.stringify({
        ...(params as Record<string, unknown>),
        action,
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseError(response);
      const error = new Error(`RPC ${action} failed: ${errorMessage}`);
      Object.assign(error, { status: response.status });
      throw error;
    }

    if (response.status === 204) {
      return null as T;
    }

    switch (options.responseType) {
      case "text":
        return await response.text() as T;
      case "arrayBuffer":
        return await response.arrayBuffer() as T;
      default:
        return await response.json() as T;
    }
  }

  /**
   * getServiceDescription retrieves the SPARQL service description.
   */
  public async getServiceDescription(
    input: GetServiceDescriptionRequest,
  ): Promise<string> {
    return await this.callRpc<string>("sparql", {
      ...input,
      query: "",
    }, {
      accept: input.contentType ?? "application/n-quads",
      responseType: "text",
    });
  }

  /**
   * close shuts down the SDK client.
   */
  public close(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * init initializes the SDK client.
   */
  public init(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * [Symbol.asyncDispose] provides support for explicit resource management.
   */
  public [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}
