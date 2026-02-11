import type { WorldsSdkOptions } from "#/options.ts";
import { parseError } from "#/utils.ts";
import { type Metric, metricSchema } from "./schema.ts";
import type { MetricListParams } from "./schema.ts";

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
    params?: MetricListParams,
  ): Promise<Metric[]> {
    const url = new URL(
      `${this.options.baseUrl}/v1/organizations/${organizationId}/metrics`,
    );
    if (params) {
      if (params.page) url.searchParams.set("page", params.page.toString());
      if (params.pageSize) {
        url.searchParams.set("pageSize", params.pageSize.toString());
      }
      if (params.featureId) {
        url.searchParams.set("featureId", params.featureId);
      }
      if (params.serviceAccountId) {
        url.searchParams.set("serviceAccountId", params.serviceAccountId);
      }
      if (params.start) url.searchParams.set("start", params.start.toString());
      if (params.end) url.searchParams.set("end", params.end.toString());
    }

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
    if (!Array.isArray(data)) {
      throw new Error("Invalid response from metrics API: expected an array");
    }

    return data.map((row) => {
      // API returns snake_case, SDK uses camelCase.
      // We map manually here to ensure compatibility with metricSchema which expects camelCase.
      const mapped = {
        id: row.id,
        serviceAccountId: row.service_account_id,
        featureId: row.feature_id,
        quantity: row.quantity,
        metadata: row.metadata,
        timestamp: row.timestamp,
      };
      return metricSchema.parse(mapped);
    });
  }

  /**
   * meter records usage for a feature.
   * Note: This is typically done via the server-side checks, but exposed here if needed
   * for client-side explicit metering (though rare).
   * For now, we only implement list as per current requirements, but defined in schema.
   */
}
