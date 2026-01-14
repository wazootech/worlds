import type {
  SearchResult,
  UsageBucketRecord,
  WorldRecord,
  WorldsOptions,
} from "./types.ts";

/**
 * Worlds is a TypeScript SDK for the Worlds API.
 */
export class Worlds {
  public constructor(
    public readonly options: WorldsOptions,
  ) {}

  /**
   * list paginates all worlds from the Worlds API.
   */
  public async list(page = 1, pageSize = 20): Promise<WorldRecord[]> {
    const url = new URL(`${this.options.baseUrl}/worlds`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    const response = await fetch(url, {
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
  public async get(worldId: string): Promise<WorldRecord | null> {
    const url = new URL(`${this.options.baseUrl}/worlds/${worldId}`);
    const response = await fetch(
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
  public async create(data: WorldRecord): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/worlds`);
    const response = await fetch(
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
  }

  /**
   * update updates a world in the Worlds API.
   */
  public async update(worldId: string, data: WorldRecord): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/worlds/${worldId}`);
    const response = await fetch(
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
   * remove removes a world from the Worlds API.
   */
  public async remove(worldId: string): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/worlds/${worldId}`);
    const response = await fetch(
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
   * sparqlQuery executes a SPARQL query against a world
   * in the Worlds API.
   *
   * @see https://www.w3.org/TR/sparql11-query/
   */
  public async sparqlQuery(
    worldId: string,
    query: string,
  ): Promise<unknown> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${worldId}/sparql`,
    );
    const response = await fetch(
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
      throw new Error(
        `Failed to execute SPARQL query: ${response.status} ${response.statusText}`,
      );
    }

    const json = await response.json();
    return json;
  }

  /**
   * sparqlUpdate executes a SPARQL update against a world
   * in the Worlds API.
   *
   * @see https://www.w3.org/TR/sparql11-update/
   */
  public async sparqlUpdate(
    worldId: string,
    update: string,
  ): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${worldId}/sparql`,
    );
    const response = await fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/sparql-update",
        },
        body: update,
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to execute SPARQL update: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * getUsage gets the usage for a specific world.
   */
  public async getUsage(worldId: string): Promise<UsageBucketRecord[]> {
    const url = new URL(
      `${this.options.baseUrl}/worlds/${worldId}/usage`,
    );
    const response = await fetch(
      url,
      {
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to get usage: ${response.status} ${response.statusText}`,
      );
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
      offset?: number;
    },
  ): Promise<SearchResult> {
    const url = new URL(`${this.options.baseUrl}/worlds/${worldId}/search`);
    url.searchParams.set("q", query);
    if (options?.limit) {
      url.searchParams.set("limit", options.limit.toString());
    }

    if (options?.offset) {
      url.searchParams.set("offset", options.offset.toString());
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to search world: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }
}

/**
 * World is a TypeScript SDK for a World in the Worlds API.
 */
export class World {
  private readonly worlds: Worlds;

  public constructor(
    public readonly options: WorldsOptions & { worldId: string },
  ) {
    this.worlds = new Worlds(options);
  }

  /**
   * get gets the world.
   */
  public get(): Promise<WorldRecord | null> {
    return this.worlds.get(this.options.worldId);
  }

  /**
   * remove removes the world.
   */
  public remove(): Promise<void> {
    return this.worlds.remove(this.options.worldId);
  }

  /**
   * update updates the world.
   */
  public update(data: WorldRecord): Promise<void> {
    return this.worlds.update(this.options.worldId, data);
  }

  /**
   * sparqlQuery executes a SPARQL query against the world.
   */
  // deno-lint-ignore no-explicit-any
  public sparqlQuery(query: string): Promise<any> {
    return this.worlds.sparqlQuery(this.options.worldId, query);
  }

  /**
   * sparqlUpdate executes a SPARQL update against the world.
   */
  public sparqlUpdate(update: string): Promise<void> {
    return this.worlds.sparqlUpdate(this.options.worldId, update);
  }

  /**
   * search searches within the world.
   */
  public search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<SearchResult> {
    return this.worlds.search(this.options.worldId, query, options);
  }
}
