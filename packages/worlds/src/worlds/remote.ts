import { worldsActionPath } from "#/core/resource-path.ts";
import type { WorldsInterface, WorldsOptions } from "#/core/types.ts";
import { parseError } from "#/core/utils.ts";
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

/**
 * RemoteWorlds is a TypeScript SDK client for the Worlds API.
 */
export class RemoteWorlds implements WorldsInterface {
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
   * list paginates all worlds from the Worlds API.
   */
  public async list(input?: WorldsListInput): Promise<World[]> {
    const url = new URL(`${this.options.baseUrl}/worlds`);

    if (input?.pageSize) {
      url.searchParams.set("pageSize", input.pageSize.toString());
    }
    if (input?.pageToken) {
      url.searchParams.set("pageToken", input.pageToken);
    }
    if (input?.namespace) {
      url.searchParams.set("namespace", input.namespace);
    }

    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to list worlds: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * get fetches a single world from the Worlds API.
   */
  public async get(input: WorldsGetInput): Promise<World | null> {
    const url = new URL(
      `${this.options.baseUrl}${worldsActionPath("get")}`,
    );

    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to get world: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * create creates a world in the Worlds API.
   */
  public async create(input: WorldsCreateInput): Promise<World> {
    const url = new URL(`${this.options.baseUrl}/worlds`);

    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to create world: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * update updates a world in the Worlds API.
   */
  public async update(input: WorldsUpdateInput): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}${worldsActionPath("update")}`,
    );

    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to update world: ${errorMessage}`);
    }
  }

  /**
   * delete deletes a world from the Worlds API.
   */
  public async delete(input: WorldsDeleteInput): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}${worldsActionPath("delete")}`,
    );

    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to delete world: ${errorMessage}`);
    }
  }

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  public async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    const url = new URL(
      `${this.options.baseUrl}${worldsActionPath("sparql")}`,
    );

    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/sparql-results+json",
        },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to execute SPARQL: ${errorMessage}`);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  /**
   * search performs semantic/text search on a world using vector embeddings.
   */
  public async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    const url = new URL(
      `${this.options.baseUrl}${worldsActionPath("search")}`,
    );

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to search: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * import ingests RDF data into a world.
   */
  public async import(input: WorldsImportInput): Promise<void> {
    const { data, contentType } = input;
    const url = new URL(
      `${this.options.baseUrl}${worldsActionPath("import")}`,
    );

    const rdfContentType = contentType ?? "application/n-quads";

    const binaryData = typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data);

    // Convert to base64
    const base64Data = btoa(String.fromCharCode(...binaryData));

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        data: base64Data,
        contentType: rdfContentType,
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to import world data: ${errorMessage}`);
    }
  }

  /**
   * export exports a world in the specified RDF content type.
   */
  public async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    const url = new URL(
      `${this.options.baseUrl}${worldsActionPath("export")}`,
    );

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to export world: ${errorMessage}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * getServiceDescription retrieves the SPARQL service description.
   */
  public async getServiceDescription(
    input: WorldsServiceDescriptionInput,
  ): Promise<string> {
    const url = new URL(
      `${this.options.baseUrl}${worldsActionPath("sparql")}`,
    );

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
        Accept: input.contentType ?? "application/n-quads",
      },
      body: JSON.stringify({
        ...input,
        query: "", // Service description is requested with an empty query
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to get service description: ${errorMessage}`);
    }

    return await response.text();
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
