import type { WorldsSdkOptions } from "#/sdk/interfaces.ts";
import { parseError } from "#/sdk/utils.ts";
import type { Metric } from "./schema.ts";

/**
 * Metrics is a TypeScript SDK for the Metrics API.
 */
export class Metrics {
  private readonly fetch: typeof fetch;

  public constructor(
    public readonly options: WorldsSdkOptions,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * list retrieves metrics for an organization.
   */
  public async list(
    organizationId: string,
  ): Promise<Metric[]> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}/metrics`,
    );
    const response = await this.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });
    if (!response.ok) {
      const errorMessage = await parseError(response);
      throw new Error(`Failed to list metrics: ${errorMessage}`);
    }

    const data = await response.json();
    return data.map((
      row: {
        id: string;
        service_account_id: string;
        feature_id: string;
        quantity: number;
        metadata: Record<string, unknown> | null;
        timestamp: number;
      },
    ) => ({
      id: row.id,
      serviceAccountId: row.service_account_id,
      featureId: row.feature_id,
      quantity: row.quantity,
      metadata: row.metadata,
      timestamp: row.timestamp,
    }));
  }

  /**
   * meter records usage for a feature.
   * Note: This is typically done via the server-side checks, but exposed here if needed
   * for client-side explicit metering (though rare).
   * For now, we only implement list as per current requirements, but defined in schema.
   */
}
