import type { AccountUsageSummary } from "#/accounts/accounts-service.ts";

export type { AccountUsageSummary };

/**
 * WorldsOptions are the options for the Worlds API SDK.
 */
export interface WorldsOptions {
  baseUrl: string;
  apiKey: string;
}

/**
 * Worlds is a TypeScript SDK for the Worlds API.
 */
export class Worlds {
  public constructor(
    public readonly options: WorldsOptions,
  ) {}

  /**
   * getWorld gets a world from the Worlds API.
   */
  public async getWorld(
    worldId: string,
    encoding: string,
  ): Promise<string | null> {
    const response = await fetch(`${this.options.baseUrl}/worlds/${worldId}`, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Accept": encoding,
      },
    });
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * setWorld sets a world in the Worlds API.
   */
  public async setWorld(
    worldId: string,
    world: string,
    encoding: string,
  ): Promise<void> {
    const response = await fetch(`${this.options.baseUrl}/worlds/${worldId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": encoding,
      },
      body: world,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * addQuads adds quads to a world in the Worlds API.
   */
  public async addQuads(
    worldId: string,
    data: string,
    encoding: string,
  ): Promise<void> {
    const response = await fetch(`${this.options.baseUrl}/worlds/${worldId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": encoding,
      },
      body: data,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * removeWorld removes a world from the Worlds API.
   */
  public async removeWorld(worldId: string): Promise<void> {
    const response = await fetch(`${this.options.baseUrl}/worlds/${worldId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * queryWorld executes a SPARQL query against a world in the Worlds API.
   * Uses POST with application/sparql-query for robustness.
   */
  public async queryWorld(
    worldId: string,
    query: string,
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
    const response = await fetch(
      `${this.options.baseUrl}/worlds/${worldId}/sparql`,
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
   * updateWorld executes a SPARQL update against a world in the Worlds API.
   */
  public async updateWorld(
    worldId: string,
    update: string,
  ): Promise<void> {
    const response = await fetch(
      `${this.options.baseUrl}/worlds/${worldId}/sparql`,
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
   * getUsage retrieves the usage summary for the authenticated account.
   */
  public async getUsage(): Promise<AccountUsageSummary> {
    const response = await fetch(`${this.options.baseUrl}/usage`, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}
