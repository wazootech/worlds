import type { WorldsManagementPlane, WorldsDataPlane, WorldsOptions } from "../engine/factory.ts";
import { parseError } from "../utils.ts";
import { encodeBase64 } from "@std/encoding/base64";
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
} from "../schema.ts";

/**
 * RemoteWorldsManagement handles the management plane (lifecycle) of worlds via RPC.
 */
export class RemoteWorldsManagement implements WorldsManagementPlane {
  constructor(private readonly client: WorldsClient) {}

  public async listWorlds(
    input?: ListWorldsRequest,
  ): Promise<ListWorldsResponse> {
    return await this.client.callRpc<ListWorldsResponse>("list", input ?? {});
  }

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

  public async createWorld(input: CreateWorldRequest): Promise<World> {
    return await this.client.callRpc<World>("create", input);
  }

  public async updateWorld(input: UpdateWorldRequest): Promise<World> {
    return await this.client.callRpc<World>("update", input);
  }

  public async deleteWorld(input: DeleteWorldRequest): Promise<void> {
    return await this.client.callRpc<void>("delete", input);
  }
}

/**
 * RemoteWorldsData handles the data plane (operations) of worlds via RPC.
 */
export class RemoteWorldsData implements WorldsDataPlane {
  constructor(private readonly client: WorldsClient) {}

  public async sparql(
    input: SparqlQueryRequest,
  ): Promise<SparqlQueryResponse> {
    return await this.client.callRpc<SparqlQueryResponse>(
      "sparql",
      input,
      {
        accept: "application/sparql-results+json",
      },
    );
  }

  public async search(
    input: SearchWorldsRequest,
  ): Promise<SearchWorldsResponse> {
    return await this.client.callRpc<SearchWorldsResponse>(
      "search",
      input,
    );
  }

  public async import(input: ImportWorldRequest): Promise<void> {
    const { data, contentType = "application/n-quads" } = input;
    const binaryData = typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data);

    const base64Data = encodeBase64(binaryData);
    return await this.client.callRpc<void>("import", {
      ...input,
      data: base64Data,
      contentType,
    });
  }

  public async export(input: ExportWorldRequest): Promise<ArrayBuffer> {
    return await this.client.callRpc<ArrayBuffer>("export", input, {
      responseType: "arrayBuffer",
    });
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
  public readonly worlds: RemoteWorldsData;

  /**
   * WorldsClient initializes the TypeScript SDK client.
   */
  public constructor(
    private readonly options: WorldsOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.management = new RemoteWorldsManagement(this);
    this.worlds = new RemoteWorldsData(this);
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

    const responseType = options.responseType ?? "json";
    if (responseType === "arrayBuffer") {
      return await response.arrayBuffer() as unknown as T;
    }
    if (responseType === "text") {
      return await response.text() as unknown as T;
    }
    return await response.json();
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