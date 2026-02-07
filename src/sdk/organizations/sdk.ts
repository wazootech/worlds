import type { WorldsSdkOptions } from "#/sdk/interfaces.ts";
import { ServiceAccounts } from "#/sdk/service-accounts/sdk.ts";
import { Metrics } from "#/sdk/metrics/sdk.ts";
import type {
  CreateOrganizationParams,
  Organization,
  UpdateOrganizationParams,
} from "./schema.ts";
import { parseError } from "#/sdk/utils.ts";

/**
 * Organizations is a TypeScript SDK for the Organizations API.
 */
export class Organizations {
  private readonly fetch: typeof fetch;
  public readonly serviceAccounts: ServiceAccounts;
  public readonly metrics: Metrics;

  public constructor(
    public readonly options: WorldsSdkOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.serviceAccounts = new ServiceAccounts(options);
    this.metrics = new Metrics(options);
  }

  /**
   * list paginates organizations from the Worlds API.
   */
  public async list(
    page = 1,
    pageSize = 20,
  ): Promise<Organization[]> {
    const url = new URL(`${this.options.baseUrl}/v1/organizations`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to list organizations: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * create creates an organization in the Worlds API.
   */
  public async create(
    data: CreateOrganizationParams,
  ): Promise<Organization> {
    const url = new URL(`${this.options.baseUrl}/v1/organizations`);
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to create organization: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * get retrieves an organization from the Worlds API.
   */
  public async get(
    organizationId: string,
  ): Promise<Organization | null> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}`,
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
      throw new Error(`Failed to get organization: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * update updates an organization in the Worlds API.
   */
  public async update(
    organizationId: string,
    data: UpdateOrganizationParams,
  ): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}`,
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
      throw new Error(`Failed to update organization: ${errorMessage}`);
    }
  }

  /**
   * delete deletes an organization from the Worlds API.
   */
  public async delete(organizationId: string): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}`,
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
      throw new Error(`Failed to delete organization: ${errorMessage}`);
    }
  }
}
