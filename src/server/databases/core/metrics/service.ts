import type { Client } from "@libsql/client";
import { ulid } from "@std/ulid/ulid";
import { insertMetric, selectLastMetric } from "./queries.sql.ts";
import type { Metric, MetricInsert } from "./schema.ts";

export class MetricsService {
  constructor(private readonly db: Client) {}

  async meter(record: MetricInsert): Promise<void> {
    const timestamp = Date.now();
    const id = ulid();

    await this.db.execute({
      sql: insertMetric,
      args: [
        id,
        record.service_account_id,
        record.feature_id,
        record.quantity,
        record.metadata ? JSON.stringify(record.metadata) : null,
        timestamp,
      ],
    });
  }

  async getLast(
    serviceAccountId: string,
    featureId: string,
  ): Promise<Metric | null> {
    const result = await this.db.execute({
      sql: selectLastMetric,
      args: [serviceAccountId, featureId],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      service_account_id: row.service_account_id as string,
      feature_id: row.feature_id as string,
      quantity: row.quantity as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      timestamp: row.timestamp as number,
    };
  }
}
