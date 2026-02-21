import type { WorldsSdkOptions } from "../../options.ts";
import type {
  CreateWorldParams,
  ExecuteSparqlOutput,
  Log,
  RdfFormat,
  TripleSearchResult,
  UpdateWorldParams,
  World,
} from "./schema.ts";
import { parseError } from "../../utils.ts";

/**
 * Worlds is a TypeScript SDK for the Worlds API.
 */
export class Worlds {
  private readonly fetch: typeof fetch;

  public constructor(
    public readonly options: WorldsSdkOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * list paginates all worlds from the Worlds API.
   */
  public async list(
    options?: {
      page?: number;
      pageSize?: number;
    },
  ): Promise<World[]> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const url = new URL(`${this.options.baseUrl}/v1/worlds`);

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
    idOrSlug: string,
  ): Promise<World | null> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${idOrSlug}`);

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
  public async create(data: CreateWorldParams): Promise<World> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds`);

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
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${worldId}`);

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
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/worlds/${worldId}`);

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
    options?: {
      defaultGraphUris?: string[];
      namedGraphUris?: string[];
    },
  ): Promise<ExecuteSparqlOutput> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/sparql`,
    );

    if (options?.defaultGraphUris) {
      for (const uri of options.defaultGraphUris) {
        url.searchParams.append("default-graph-uri", uri);
      }
    }

    if (options?.namedGraphUris) {
      for (const uri of options.namedGraphUris) {
        url.searchParams.append("named-graph-uri", uri);
      }
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
    worldId: string,
    query: string,
    options?: {
      limit?: number;
      subjects?: string[];
      predicates?: string[];
    },
  ): Promise<TripleSearchResult[]> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/search`,
    );

    url.searchParams.set("query", query);

    if (options?.limit) {
      url.searchParams.set("limit", options.limit.toString());
    }

    if (options?.subjects) {
      for (const s of options.subjects) {
        url.searchParams.append("subjects", s);
      }
    }

    if (options?.predicates) {
      for (const p of options.predicates) {
        url.searchParams.append("predicates", p);
      }
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
   * import imports data into a world.
   */
  public async import(
    worldId: string,
    data: string | ArrayBuffer,
    options?: {
      format?: RdfFormat;
    },
  ): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/import`,
    );

    const contentType = options?.format === "turtle"
      ? "text/turtle"
      : options?.format === "n-triples"
      ? "application/n-triples"
      : options?.format === "n3"
      ? "text/n3"
      : "application/n-quads";

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": contentType,
      },
      body: data,
    });

    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to import world data: ${errorMessage}`);
    }
  }

  /**
   * export exports a world in the specified RDF format.
   *
   * @example
   * ```ts
   * const buffer = await sdk.worlds.export(worldId, { format: "turtle" });
   * const text = new TextDecoder().decode(buffer);
   * ```
   */
  public async export(
    worldId: string,
    options?: { format?: RdfFormat },
  ): Promise<ArrayBuffer> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/export`,
    );
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
      throw new Error(`Failed to export world: ${errorMessage}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * listLogs lists the logs for a world.
   */
  public async listLogs(
    worldId: string,
    options?: {
      page?: number;
      pageSize?: number;
      level?: string;
    },
  ): Promise<Log[]> {
    const url = new URL(
      `${this.options.baseUrl}/v1/worlds/${worldId}/logs`,
    );

    if (options?.page) {
      url.searchParams.set("page", options.page.toString());
    }

    if (options?.pageSize) {
      url.searchParams.set("pageSize", options.pageSize.toString());
    }

    if (options?.level) {
      url.searchParams.set("level", options.level);
    }

    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to list logs: ${errorMessage}`);
    }

    return await response.json();
  }
}
