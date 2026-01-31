import type { WorldsOptions } from "#/sdk/interfaces.ts";
import type {
  CreateWorldParams,
  RdfFormat,
  SearchResult,
  SearchResultItem,
  SparqlResult,
  UpdateWorldParams,
  WorldRecord,
} from "./schema.ts";
import { parseError } from "#/sdk/parse-error.ts";

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
    options?: { tenantId?: string },
  ): Promise<WorldRecord[]> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds`);
    const tenantId = options?.tenantId;
    if (tenantId) {
      url.searchParams.set("tenant", tenantId);
    }

    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
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
   * get gets a world from the Worlds API.
   */
  public async get(
    worldId: string,
    options?: { tenantId?: string },
  ): Promise<WorldRecord | null> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${worldId}`);
    const tenantId = options?.tenantId;
    if (tenantId) {
      url.searchParams.set("tenant", tenantId);
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to get world: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * create creates a world in the Worlds API.
   */
  public async create(
    data: CreateWorldParams,
    options?: { tenantId?: string },
  ): Promise<WorldRecord> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds`);
    const tenantId = options?.tenantId;
    if (tenantId) {
      url.searchParams.set("tenant", tenantId);
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to create world: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * update updates a world in the Worlds API.
   */
  public async update(
    worldId: string,
    data: UpdateWorldParams,
    options?: { tenantId?: string },
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${worldId}`);
    const tenantId = options?.tenantId;
    if (tenantId) {
      url.searchParams.set("tenant", tenantId);
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to update world: ${errorMessage}`);
    }
  }

  /**
   * delete deletes a world from the Worlds API.
   */
  public async delete(
    worldId: string,
    options?: { tenantId?: string },
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${worldId}`);
    const tenantId = options?.tenantId;
    if (tenantId) {
      url.searchParams.set("tenant", tenantId);
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to remove world: ${errorMessage}`);
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
    options?: { tenantId?: string },
  ): Promise<SparqlResult | null> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/sparql`,
    );
    const tenantId = options?.tenantId;
    if (tenantId) {
      url.searchParams.set("tenant", tenantId);
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to execute SPARQL: ${errorMessage}`);
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
      tenantId?: string;
    },
  ): Promise<SearchResult<SearchResultItem>[]> {
    const url = new URL(`${this.options.baseUrl}/v1/search`);
    const tenantId = options?.tenantId;
    if (tenantId) {
      url.searchParams.set("tenant", tenantId);
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to search: ${errorMessage}`);
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
    options?: { format?: RdfFormat; tenantId?: string },
  ): Promise<ArrayBuffer> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/download`,
    );
    const tenantId = options?.tenantId;
    if (tenantId) {
      url.searchParams.set("tenant", tenantId);
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to download world: ${errorMessage}`);
    }

    return await response.arrayBuffer();
  }
}
