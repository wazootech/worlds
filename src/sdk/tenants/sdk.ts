import type { WorldsSdkOptions } from "#/sdk/interfaces.ts";
import type {
  CreateTenantParams,
  TenantRecord,
  UpdateTenantParams,
} from "./schema.ts";
import { parseError } from "#/sdk/utils.ts";

/**
 * Tenants is a TypeScript SDK for the Tenants API.
 */
export class Tenants {
  private readonly fetch: typeof fetch;

  public constructor(
    public readonly options: WorldsSdkOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * list paginates tenants from the Worlds API.
   */
  public async list(
    page = 1,
    pageSize = 20,
  ): Promise<TenantRecord[]> {
    const url = new URL(`${this.options.baseUrl}/v1/tenants`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to list tenants: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * create creates a tenant in the Worlds API.
   */
  public async create(data: CreateTenantParams): Promise<TenantRecord> {
    const url = new URL(`${this.options.baseUrl}/v1/tenants`);
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
      throw new Error(`Failed to create tenant: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * get retrieves a tenant from the Worlds API.
   */
  public async get(
    tenantId: string,
  ): Promise<TenantRecord | null> {
    const url = new URL(`${this.options.baseUrl}/v1/tenants/${tenantId}`);
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
      throw new Error(`Failed to get tenant: ${errorMessage}`);
    }

    return await response.json();
  }

  /**
   * update updates a tenant in the Worlds API.
   */
  public async update(
    tenantId: string,
    data: UpdateTenantParams,
  ): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/tenants/${tenantId}`);
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
      throw new Error(`Failed to update tenant: ${errorMessage}`);
    }
  }

  /**
   * delete deletes a tenant from the Worlds API.
   */
  public async delete(tenantId: string): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/tenants/${tenantId}`);
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
      throw new Error(`Failed to delete tenant: ${errorMessage}`);
    }
  }

  /**
   * rotate rotates the API key of a tenant.
   */
  public async rotate(tenantId: string): Promise<void> {
    const url = new URL(
      `${this.options.baseUrl}/v1/tenants/${tenantId}/rotate`,
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
      const errorMessage = await parseError(response);
      throw new Error(`Failed to rotate tenant key: ${errorMessage}`);
    }
  }
}
