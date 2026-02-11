import type { WorldsSdkOptions } from "#/options.ts";
import { parseError } from "#/utils.ts";
import type {
  CreateServiceAccountParams,
  ServiceAccount,
  ServiceAccountCreated,
  UpdateServiceAccountParams,
} from "./schema.ts";

/**
 * ServiceAccounts is a TypeScript SDK for the Service Accounts API.
 */
export class ServiceAccounts {
  private readonly fetch: typeof fetch;

  public constructor(
    public readonly options: WorldsSdkOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * list paginates service accounts from the Worlds API.
   */
  public async list(
    organizationId: string,
    page = 1,
    pageSize = 20,
  ): Promise<ServiceAccount[]> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}/service-accounts`,
    );
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to list service accounts: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * create creates a service account in the Worlds API.
   */
  public async create(
    organizationId: string,
    data?: CreateServiceAccountParams,
  ): Promise<ServiceAccountCreated> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}/service-accounts`,
    );
    const response = await this.fetch(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data ?? {}),
      },
    );
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to create service account: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * get retrieves a service account from the Worlds API.
   */
  public async get(
    organizationId: string,
    accountId: string,
  ): Promise<ServiceAccount | null> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}/service-accounts/${accountId}`,
    );
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
      throw new Error(`Failed to get service account: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * update updates a service account in the Worlds API.
   */
  public async update(
    organizationId: string,
    accountId: string,
    data: UpdateServiceAccountParams,
  ): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}/service-accounts/${accountId}`,
    );
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
      throw new Error(`Failed to update service account: ${errorMessage}`);
    }
  }

  /**
   * delete deletes a service account from the Worlds API.
   */
  public async delete(
    organizationId: string,
    accountId: string,
  ): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}/service-accounts/${accountId}`,
    );
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
      throw new Error(`Failed to delete service account: ${errorMessage}`);
    }
  }
}
