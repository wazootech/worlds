import type { WorldsOptions } from "#/factory.ts";
import { parseError } from "#/utils.ts";
import { encodeBase64 } from "@std/encoding/base64";
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
} from "#/schemas/input.ts";
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
 * RemoteWorlds is a TypeScript SDK client for the Worlds API.
 */
export class RemoteWorlds {
  private readonly fetch: typeof fetch;

  /**
   * RemoteWorlds initializes the TypeScript SDK client.
   */
  public constructor(
    private readonly options: WorldsOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * callRpc executes a unified RPC call.
   */
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
      const errorMessage = await parseError(response);
      const error = new Error(`RPC ${action} failed: ${errorMessage}`);
      // Attach status code for robust error handling
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
   * list paginates all worlds from the Worlds API.
   */
  public async list(input?: WorldsListInput): Promise<World[]> {
    return await this.callRpc<World[]>("list", input ?? {});
  }

  /**
   * get fetches a single world from the Worlds API.
   */
  public async get(input: WorldsGetInput): Promise<World | null> {
    try {
      return await this.callRpc<World>("get", input);
    } catch (error) {
      if (
        error && typeof error === "object" && "status" in error &&
        (error as { status: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  /**
   * create creates a world in the Worlds API.
   */
  public async create(input: WorldsCreateInput): Promise<World> {
    return await this.callRpc<World>("create", input);
  }

  /**
   * update updates a world in the Worlds API.
   */
  public async update(input: WorldsUpdateInput): Promise<void> {
    return await this.callRpc<void>("update", input);
  }

  /**
   * delete deletes a world from the Worlds API.
   */
  public async delete(input: WorldsDeleteInput): Promise<void> {
    return await this.callRpc<void>("delete", input);
  }

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  public async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    return await this.callRpc<WorldsSparqlOutput>("sparql", input, {
      accept: "application/sparql-results+json",
    });
  }

  /**
   * search performs semantic/text search on a world using vector embeddings.
   */
  public async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    return await this.callRpc<WorldsSearchOutput[]>("search", input);
  }

  /**
   * import ingests RDF data into a world.
   */
  public async import(input: WorldsImportInput): Promise<void> {
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

  /**
   * export exports a world in the specified RDF content type.
   */
  public async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    return await this.callRpc<ArrayBuffer>("export", input, {
      responseType: "arrayBuffer",
    });
  }

  /**
   * getServiceDescription retrieves the SPARQL service description.
   */
  public async getServiceDescription(
    input: WorldsServiceDescriptionInput,
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
