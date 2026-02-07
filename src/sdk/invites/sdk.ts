import type { WorldsSdkOptions } from "#/sdk/interfaces.ts";
import type { CreateInviteParams, Invite } from "./schema.ts";

/**
 * RedeemInviteResult represents the result of redeeming an invite.
 */
export interface RedeemInviteResult {
  message: string;
  plan: string;
}

/**
 * Invites is a TypeScript SDK for the Invites API.
 */
export class Invites {
  private readonly fetch: typeof fetch;

  public constructor(
    public readonly options: WorldsSdkOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * list paginates invites from the Worlds API.
   */
  public async list(
    page = 1,
    pageSize = 20,
  ): Promise<Invite[]> {
    const url = new URL(`${this.options.baseUrl}/v1/invites`);
    url.searchParams.set("page", page.toString());
    url.searchParams.set("pageSize", pageSize.toString());
    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to list invites: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * create creates an invite in the Worlds API.
   */
  public async create(data?: CreateInviteParams): Promise<Invite> {
    const url = new URL(`${this.options.baseUrl}/v1/invites`);
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
      throw new Error(
        `Failed to create invite: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * get retrieves an invite from the Worlds API.
   */
  public async get(
    code: string,
  ): Promise<Invite | null> {
    const url = new URL(`${this.options.baseUrl}/v1/invites/${code}`);
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
        `Failed to get invite: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * delete deletes an invite from the Worlds API.
   */
  public async delete(code: string): Promise<void> {
    const url = new URL(`${this.options.baseUrl}/v1/invites/${code}`);
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
        `Failed to delete invite: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * redeem redeems an invite code to upgrade an organization's plan to "free".
   */
  public async redeem(
    code: string,
    organizationId: string,
  ): Promise<RedeemInviteResult> {
    const url = new URL(`${this.options.baseUrl}/v1/invites/${code}/redeem`);
    url.searchParams.set("organization", organizationId);
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
        `Failed to redeem invite: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }
}
