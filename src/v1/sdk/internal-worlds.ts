import type {
  Account,
  AccountUsageSummary,
} from "#/accounts/accounts-service.ts";
import { Worlds } from "./worlds.ts";

export type { Account, AccountUsageSummary };

export { Worlds };

/**
 * InternalWorlds is a TypeScript SDK for internal/owner-only operations
 * on the Worlds API.
 */
export class InternalWorlds extends Worlds {
  public constructor(options: Worlds["options"]) {
    super(options);
  }

  /**
   * createAccount creates a new account in the Worlds API.
   */
  public async createAccount(account: Account): Promise<Account> {
    const response = await fetch(`${this.options.baseUrl}/accounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(account),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * getAccount retrieves an account from the Worlds API.
   */
  public async getAccount(accountId: string): Promise<Account> {
    const response = await fetch(
      `${this.options.baseUrl}/accounts/${accountId}`,
      {
        method: "GET",
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

  /**
   * updateAccount updates an existing account in the Worlds API.
   */
  public async updateAccount(account: Account): Promise<void> {
    const response = await fetch(
      `${this.options.baseUrl}/accounts/${account.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(account),
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * removeAccount removes an account from the Worlds API.
   */
  public async removeAccount(accountId: string): Promise<void> {
    const response = await fetch(
      `${this.options.baseUrl}/accounts/${accountId}`,
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
   * getAccountUsage retrieves the usage summary for a specific account.
   * This is an admin-only operation.
   */
  public async getAccountUsage(
    accountId: string,
  ): Promise<AccountUsageSummary> {
    const response = await fetch(
      `${this.options.baseUrl}/usage?accountId=${accountId}`,
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

  /**
   * listAccounts retrieves all accounts from the Worlds API.
   * This is an admin-only operation.
   */
  public async listAccounts(): Promise<Account[]> {
    const response = await fetch(`${this.options.baseUrl}/accounts`, {
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
