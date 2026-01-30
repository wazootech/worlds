import type { WorldsOptions } from "#/sdk/types.ts";
import type {
  AccountRecord,
  CreateAccountParams,
  UpdateAccountParams,
} from "#/sdk/internal/types.ts";

/**
 * Accounts is a TypeScript SDK for the Accounts API.
 */
export class Accounts {
  private readonly fetch: typeof fetch;

  public constructor(
    public readonly options: WorldsOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * list paginates accounts from the Worlds API.
   */
  public async list(
    page = 1,
    pageSize = 20,
  ): Promise<AccountRecord[]> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to list accounts: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * create creates an account in the Worlds API.
   */
  public async create(data: CreateAccountParams): Promise<AccountRecord> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts`);
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
        `Failed to create account: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * get retrieves an account from the Worlds API.
   */
  public async get(
    accountId: string,
  ): Promise<AccountRecord | null> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts/${accountId}`);
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
        `Failed to get account: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * update updates an account in the Worlds API.
   */
  public async update(
    accountId: string,
    data: UpdateAccountParams,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts/${accountId}`);
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
        `Failed to update account: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * delete deletes an account from the Worlds API.
   */
  public async delete(accountId: string): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts/${accountId}`);
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
        `Failed to delete account: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * rotate rotates the API key of an account.
   */
  public async rotate(accountId: string): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/v1/accounts/${accountId}/rotate`,
    );
    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to rotate account key: ${response.status} ${response.statusText}`,
      );
    }
  }
}
