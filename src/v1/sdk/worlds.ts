import type { AccountUsageSummary } from "#/accounts/accounts-service.ts";

/**
 * Worlds is a TypeScript SDK for the Worlds API.
 */
export class Worlds {
  public constructor(
    public readonly options: {
      baseUrl: string;
      apiKey: string;
    },
  ) {}

  /**
   * getStore gets a store from the Worlds API.
   */
  public async getStore(
    storeId: string,
    encoding: string,
  ): Promise<string | null> {
    const response = await fetch(`${this.options.baseUrl}/stores/${storeId}`, {
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
   * setStore sets a store in the Worlds API.
   */
  public async setStore(
    storeId: string,
    store: string,
    encoding: string,
  ): Promise<void> {
    const response = await fetch(`${this.options.baseUrl}/stores/${storeId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": encoding,
      },
      body: store,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * addQuads adds quads to a store in the Worlds API.
   */
  public async addQuads(
    storeId: string,
    data: string,
    encoding: string,
  ): Promise<void> {
    const response = await fetch(`${this.options.baseUrl}/stores/${storeId}`, {
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
   * removeStore removes a store from the Worlds API.
   */
  public async removeStore(storeId: string): Promise<void> {
    const response = await fetch(`${this.options.baseUrl}/stores/${storeId}`, {
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
   * query executes a SPARQL query against a store in the Worlds API.
   * Uses POST with application/sparql-query for robustness.
   */
  public async query(
    storeId: string,
    query: string,
    // deno-lint-ignore no-explicit-any
  ): Promise<any> {
    const response = await fetch(
      `${this.options.baseUrl}/stores/${storeId}/sparql`,
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
   * update executes a SPARQL update against a store in the Worlds API.
   */
  public async update(
    storeId: string,
    update: string,
  ): Promise<void> {
    const response = await fetch(
      `${this.options.baseUrl}/stores/${storeId}/sparql`,
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
