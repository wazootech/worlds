import type {
  DecodableEncoding,
  EncodableEncoding,
} from "#/oxigraph/oxigraph-encoding.ts";

/**
 * WorldsApiSdk is a TypeScript SDK for the Worlds API.
 */
export class WorldsApiSdk {
  public constructor(
    public readonly baseUrl: string,
    public readonly apiKey: string,
  ) {}

  /**
   * getStore gets a store from the Worlds API.
   */
  public async getStore(
    storeId: string,
    encoding: DecodableEncoding,
  ): Promise<string | null> {
    const response = await fetch(`${this.baseUrl}/stores/${storeId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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
    encoding: EncodableEncoding,
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/stores/${storeId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": encoding,
      },
      body: store,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
    }
  }

  /**
   * addQuads adds quads to a store in the Worlds API.
   */
  public async addQuads(
    storeId: string,
    data: string,
    encoding: EncodableEncoding,
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/stores/${storeId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": encoding,
      },
      body: data,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * deleteStore deletes a store from the Worlds API.
   */
  public async deleteStore(storeId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/stores/${storeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/stores/${storeId}/sparql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/sparql-query",
        "Accept": "application/sparql-results+json",
      },
      body: query,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * update executes a SPARQL update against a store in the Worlds API.
   */
  public async update(
    storeId: string,
    update: string,
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/stores/${storeId}/sparql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/sparql-update",
      },
      body: update,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}
