import type {
  CreateWorldParams,
  RdfFormat,
  SparqlResult,
  UpdateWorldParams,
  WorldRecord,
  WorldsOptions,
  WorldsSearchResult,
} from "./types.ts";

/**
 * Worlds is a TypeScript SDK for the Worlds API.
 */
export class Worlds {
  private readonly fetch: typeof fetch;

  public constructor(
    public readonly options: WorldsOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * list paginates all worlds from the Worlds API.
   */
  public async list(
    page = 1,
    pageSize = 20,
    options?: { accountId?: string },
  ): Promise<WorldRecord[]> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds`);
    if (options?.accountId) {
      url.searchParams.set("account", options.accountId);
    }

    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to list worlds: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * get gets a world from the Worlds API.
   */
  public async get(
    worldId: string,
    options?: { accountId?: string },
  ): Promise<WorldRecord | null> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${worldId}`);
    if (options?.accountId) {
      url.searchParams.set("account", options.accountId);
    }

    const response = await this.fetch(
      url,
      {
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to get world: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * create creates a world in the Worlds API.
   */
  public async create(
    data: CreateWorldParams,
    options?: { accountId?: string },
  ): Promise<WorldRecord> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds`);
    if (options?.accountId) {
      url.searchParams.set("account", options.accountId);
    }

    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to create world: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * update updates a world in the Worlds API.
   */
  public async update(
    worldId: string,
    data: UpdateWorldParams,
    options?: { accountId?: string },
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${worldId}`);
    if (options?.accountId) {
      url.searchParams.set("account", options.accountId);
    }

    const response = await this.fetch(
      url,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to update world: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * delete deletes a world from the Worlds API.
   */
  public async delete(
    worldId: string,
    options?: { accountId?: string },
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${worldId}`);
    if (options?.accountId) {
      url.searchParams.set("account", options.accountId);
    }

    const response = await this.fetch(
      url,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to remove world: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * sparql executes a SPARQL query or update against a world
   * in the Worlds API.
   *
   * @see https://www.w3.org/TR/sparql11-protocol/
   */
  public async sparql(
    worldId: string,
    query: string,
    options?: { accountId?: string },
  ): Promise<SparqlResult | null> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/sparql`,
    );
    if (options?.accountId) {
      url.searchParams.set("account", options.accountId);
    }

    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/sparql-query",
          "Accept": "application/sparql-results+json",
        },
        body: query,
      },
    );
    if (!response.ok) {
      // Try to extract error message from response body
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const errorBody = await response.json();
          if (errorBody.error) {
            errorMessage = errorBody.error;
          } else if (errorBody.message) {
            errorMessage = errorBody.message;
          }
        } else {
          const text = await response.text();
          if (text) {
            errorMessage = text;
          }
        }
      } catch {
        // If we can't parse the error, use the status text
      }
      throw new Error(
        `Failed to execute SPARQL: ${errorMessage}`,
      );
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  /**
   * search searches a world.
   */
  public async search(
    query: string,
    options?: {
      worldIds?: string[];
      limit?: number;
      accountId?: string;
    },
  ): Promise<WorldsSearchResult[]> {
    const url = new URL(`${this.options.baseUrl}/v1/search`);
    if (options?.accountId) {
      url.searchParams.set("account", options.accountId);
    }

    url.searchParams.set("q", query);
    if (options?.worldIds && options?.worldIds.length > 0) {
      url.searchParams.set("worlds", options.worldIds.join(","));
    }

    if (options?.limit) {
      url.searchParams.set("limit", options.limit.toString());
    }

    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to search: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * download downloads a world in the specified RDF format.
   *
   * @example
   * ```ts
   * const buffer = await sdk.worlds.download(worldId, { format: "turtle" });
   * const text = new TextDecoder().decode(buffer);
   * ```
   */
  public async download(
    worldId: string,
    options?: { format?: RdfFormat; accountId?: string },
  ): Promise<ArrayBuffer> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/download`,
    );
    if (options?.accountId) {
      url.searchParams.set("account", options.accountId);
    }
    if (options?.format) {
      url.searchParams.set("format", options.format);
    }

    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download world: ${response.status} ${response.statusText}`,
      );
    }

    return await response.arrayBuffer();
  }
}
