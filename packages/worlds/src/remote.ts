import type { WorldsOptions } from "./types.ts";
import type {
  CreateWorldParams,
  ExecuteSparqlOutput,
  Log,
  TripleSearchResult,
  UpdateWorldParams,
  World,
  WorldsContentType,
} from "./schema.ts";
import { parseError } from "./utils.ts";
import type { WorldsInterface } from "./types.ts";

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
  public async list(
    options?: {
      limit?: number;
      offset?: number;
      page?: number;
      pageSize?: number;
    },
  ): Promise<World[]> {
    const url = new URL(`${this.options.baseUrl}/worlds`);

    if (options?.limit) url.searchParams.set("limit", options.limit.toString());
    if (options?.offset) {
      url.searchParams.set("offset", options.offset.toString());
    }
    if (options?.page) url.searchParams.set("page", options.page.toString());
    if (options?.pageSize) {
      url.searchParams.set("pageSize", options.pageSize.toString());
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
  public async get(
    idOrSlug: string,
  ): Promise<World | null> {
    const url = new URL(`${this.options.baseUrl}/worlds/${idOrSlug}`);

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
    const url = new URL(`${this.options.baseUrl}/worlds`);

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
    idOrSlug: string,
    data: UpdateWorldParams,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/worlds/${idOrSlug}`);

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
    idOrSlug: string,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/worlds/${idOrSlug}`);

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
      throw new Error(`Failed to delete world: ${errorMessage}`);
    }
  }

  /**
   * sparql executes a SPARQL query or update against a world.
   */
  public async sparql(
    idOrSlug: string,
    query: string,
    options?: {
      defaultGraphUris?: string[];
      namedGraphUris?: string[];
    },
  ): Promise<ExecuteSparqlOutput> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/sparql`,
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
   * ask performs a deterministic boolean check (SPARQL ASK) against a world.
   */
  public async ask(
    idOrSlug: string,
    queryOrTriple: string,
  ): Promise<boolean> {
    const result = await this.sparql(idOrSlug, queryOrTriple);
    if (!result || typeof result !== "object" || !("boolean" in result)) {
      return false;
    }
    return result.boolean as boolean;
  }

  /**
   * search performs semantic/text search on a world using vector embeddings.
   */
  public async search(
    idOrSlug: string,
    query: string,
    options?: {
      limit?: number;
      subjects?: string[];
      predicates?: string[];
      types?: string[];
    },
  ): Promise<TripleSearchResult[]> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/search`,
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

    if (options?.types) {
      for (const t of options.types) {
        url.searchParams.append("types", t);
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
   * import ingests RDF data into a world.
   */
  public async import(
    idOrSlug: string,
    data: string | ArrayBuffer,
    options?: {
      contentType?: WorldsContentType;
    },
  ): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/import`,
    );

    const contentType = options?.contentType ?? "application/n-quads";

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
   * export exports a world in the specified RDF content type.
   */
  public async export(
    idOrSlug: string,
    options?: { contentType?: WorldsContentType },
  ): Promise<ArrayBuffer> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/export`,
    );
    if (options?.contentType) {
      url.searchParams.set("contentType", options.contentType);
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
   * getServiceDescription retrieves the SPARQL service description.
   */
  public async getServiceDescription(
    idOrSlug: string,
    options: { endpointUrl: string; contentType?: WorldsContentType },
  ): Promise<string> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/sparql`,
    );
    if (options.contentType) {
      url.searchParams.set("contentType", options.contentType);
    }

    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        Accept: options.contentType ?? "application/n-quads",
      },
    });

    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to get service description: ${errorMessage}`);
    }

    return await response.text();
  }

  /**
   * listLogs retrieves execution and audit logs.
   */
  public async listLogs(
    idOrSlug: string,
    options?: {
      page?: number;
      pageSize?: number;
      level?: string;
    },
  ): Promise<Log[]> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/logs`,
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
