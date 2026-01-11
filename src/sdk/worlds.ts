import type { UsageBucket, World } from "./types.ts";

/**
 * WorldsOptions are the options for the Worlds API SDK.
 */
export interface WorldsOptions {
  baseUrl: string;
  apiKey: string;
}

/**
 * WorldsAPI is a TypeScript SDK for the Worlds API.
 */
export class WorldsAPI {
  public constructor(
    public readonly options: WorldsOptions,
  ) {}

  /**
   * getWorlds gets all worlds from the Worlds API.
   */
  public async getWorlds(page = 1, pageSize = 20): Promise<World[]> {
    const url = new URL(`${this.options.baseUrl}/worlds`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * getWorld gets a world from the Worlds API.
   */
  public async getWorld(
    worldId: string,
  ): Promise<World | null> {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  public async createWorld(data: World): Promise<void> {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  public async updateWorld(worldId: string, data: World): Promise<void> {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * removeWorld removes a world from the Worlds API.
   */
  public async removeWorld(worldId: string): Promise<void> {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * sparqlQueryWorld executes a SPARQL query against a world in the Worlds API.
   * Uses POST with application/sparql-query for robustness.
   */
  public async sparqlQueryWorld(
    worldId: string,
    query: string,
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return json;
  }

  /**
   * sparqlUpdateWorld executes a SPARQL update against a world in the Worlds API.
   */
  public async sparqlUpdateWorld(
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * getWorldUsage gets the usage for a specific world.
   */
  public async getWorldUsage(
    worldId: string,
  ): Promise<UsageBucket[]> {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }
}

/**
 * WorldAPI is a TypeScript SDK for a World in the Worlds API.
 */
export class WorldAPI {
  private readonly worlds: WorldsAPI;

  public constructor(
    public readonly options: WorldsOptions & { worldId: string },
  ) {
    this.worlds = new WorldsAPI(options);
  }

  /**
   * get gets the world.
   */
  public get(): Promise<World | null> {
    return this.worlds.getWorld(this.options.worldId);
  }

  /**
   * remove removes the world.
   */
  public remove(): Promise<void> {
    return this.worlds.removeWorld(this.options.worldId);
  }

  /**
   * update updates the world.
   */
  public update(data: World): Promise<void> {
    return this.worlds.updateWorld(this.options.worldId, data);
  }

  /**
   * sparqlQuery executes a SPARQL query against the world.
   */
  // deno-lint-ignore no-explicit-any
  public sparqlQuery(query: string): Promise<any> {
    return this.worlds.sparqlQueryWorld(this.options.worldId, query);
  }

  /**
   * sparqlUpdate executes a SPARQL update against the world.
   */
  public sparqlUpdate(update: string): Promise<void> {
    return this.worlds.sparqlUpdateWorld(this.options.worldId, update);
  }
}
