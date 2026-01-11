import type { WorldsOptions } from "./worlds.ts";
import type { Account, CreateAccountParams } from "./types.ts";

/**
 * Accounts is a TypeScript SDK for the Accounts API.
 */
export class Accounts {
  public constructor(
    public readonly options: WorldsOptions,
  ) {}

  /**
   * getAccounts gets all accounts from the Worlds API.
   */
  public async getAccounts(
    page = 1,
    pageSize = 20,
  ): Promise<Account[]> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts`);
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
   * createAccount creates an account in the Worlds API.
   */
  public async createAccount(data: CreateAccountParams): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts`);
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

  /**
   * getAccount gets an account from the Worlds API.
   */
  public async getAccount(
    accountId: string,
  ): Promise<Account | null> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts/${accountId}`);
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

  /**
   * updateAccount updates an account in the Worlds API.
   */
  public async updateAccount(
    accountId: string,
    data: Partial<Account>,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts/${accountId}`);
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
   * deleteAccount deletes an account from the Worlds API.
   */
  public async deleteAccount(accountId: string): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/accounts/${accountId}`);
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
   * rotateAccountKey rotates the API key of an account.
   */
  public async rotateAccountKey(accountId: string): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/v1/accounts/${accountId}/rotate`,
    );
    const response = await fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}
