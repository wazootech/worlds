import type { RemoteWorldsOptions, WorldsInterface } from "#/engine/service.ts";
import { isErrorResponseData } from "#/utils.ts";
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
} from "#/schema.ts";

export class RemoteWorlds implements WorldsInterface {
  private readonly fetch: typeof fetch;

  public constructor(
    private readonly options: RemoteWorldsOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  public async listWorlds(
    input?: ListWorldsRequest,
  ): Promise<ListWorldsResponse> {
    return await this.callRpc<ListWorldsResponse>("list", input ?? {});
  }

  public async getWorld(input: GetWorldRequest): Promise<World | null> {
    try {
      return await this.callRpc<World>("get", input);
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
    return await this.callRpc<World>("create", input);
  }

  public async updateWorld(input: UpdateWorldRequest): Promise<World> {
    return await this.callRpc<World>("update", input);
  }

  public async deleteWorld(input: DeleteWorldRequest): Promise<void> {
    return await this.callRpc<void>("delete", input);
  }

  public async sparql(
    input: SparqlQueryRequest,
  ): Promise<SparqlQueryResponse> {
    return await this.callRpc<SparqlQueryResponse>(
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
    return await this.callRpc<SearchWorldsResponse>(
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
    return await this.callRpc<void>("import", {
      ...input,
      data: base64Data,
      contentType,
    });
  }

  public async export(input: ExportWorldRequest): Promise<ArrayBuffer> {
    return await this.callRpc<ArrayBuffer>("export", input, {
      responseType: "arrayBuffer",
    });
  }

  private async callRpc<T, P = unknown>(
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
      let errorMessage = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (isErrorResponseData(body)) {
          errorMessage = body.error.message;
        }
      } catch {
        // Response body is not JSON, use status text
      }
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

  public close(): Promise<void> {
    return Promise.resolve();
  }

  public init(): Promise<void> {
    return Promise.resolve();
  }

  public [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}
