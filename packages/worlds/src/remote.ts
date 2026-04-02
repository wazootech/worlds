import type { WorldsOptions } from "./types.ts";
import type {
  Log,
  World,
  WorldsCreateInput,
  WorldsDeleteInput,
  WorldsExportInput,
  WorldsGetInput,
  WorldsImportInput,
  WorldsListInput,
  WorldsLogsInput,
  WorldsSearchInput,
  WorldsSearchOutput,
  WorldsServiceDescriptionInput,
  WorldsSparqlInput,
  WorldsSparqlOutput,
  WorldsUpdateInput,
} from "./schemas/mod.ts";
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
  public async list(input?: WorldsListInput): Promise<World[]> {
    const url = new URL(`${this.options.baseUrl}/worlds`);

    if (input?.page) url.searchParams.set("page", input.page.toString());
    if (input?.pageSize) {
      url.searchParams.set("pageSize", input.pageSize.toString());
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
    const url = new URL(`${this.options.baseUrl}/worlds/${input.world}`);

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
    const { world: idOrSlug, ...data } = input;
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
  public async delete(input: WorldsDeleteInput): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/worlds/${input.world}`);

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
  public async sparql(input: WorldsSparqlInput): Promise<WorldsSparqlOutput> {
    const { world: idOrSlug, query, defaultGraphUris, namedGraphUris } = input;
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/sparql`,
    );

    if (defaultGraphUris) {
      for (const uri of defaultGraphUris) {
        url.searchParams.append("default-graph-uri", uri);
      }
    }

    if (namedGraphUris) {
      for (const uri of namedGraphUris) {
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
   * search performs semantic/text search on a world using vector embeddings.
   */
  public async search(input: WorldsSearchInput): Promise<WorldsSearchOutput[]> {
    const { world: idOrSlug, query, limit, subjects, predicates, types } =
      input;
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/search`,
    );

    url.searchParams.set("query", query);

    if (limit) {
      url.searchParams.set("limit", limit.toString());
    }

    if (subjects) {
      for (const s of subjects) {
        url.searchParams.append("subjects", s);
      }
    }

    if (predicates) {
      for (const p of predicates) {
        url.searchParams.append("predicates", p);
      }
    }

    if (types) {
      for (const t of types) {
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
  public async import(input: WorldsImportInput): Promise<void> {
    const { world: idOrSlug, data, contentType } = input;
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/import`,
    );

    const type = contentType ?? "application/n-quads";

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": type,
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
  public async export(input: WorldsExportInput): Promise<ArrayBuffer> {
    const { world: idOrSlug, contentType } = input;
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/export`,
    );
    if (contentType) {
      url.searchParams.set("contentType", contentType);
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
    input: WorldsServiceDescriptionInput,
  ): Promise<string> {
    const { world: idOrSlug, endpointUrl: _endpointUrl, contentType } = input;
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/sparql`,
    );
    if (contentType) {
      url.searchParams.set("contentType", contentType);
    }

    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        Accept: contentType ?? "application/n-quads",
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
  public async listLogs(input: WorldsLogsInput): Promise<Log[]> {
    const { world: idOrSlug, page, pageSize, level } = input;
    const url = new URL(
      `${this.options.baseUrl}/worlds/${idOrSlug}/logs`,
    );

    if (page) {
      url.searchParams.set("page", page.toString());
    }

    if (pageSize) {
      url.searchParams.set("pageSize", pageSize.toString());
    }

    if (level) {
      url.searchParams.set("level", level);
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
