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

  async list(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      feature_id?: string;
      service_account_id?: string;
      start?: number;
      end?: number;
    } = {},
  ): Promise<Metric[]> {
    let sql = `
      SELECT
        m.*
      FROM
        metrics m
      JOIN
        service_accounts sa ON m.service_account_id = sa.id
      WHERE
        sa.organization_id = ?
    `;
    const args: (string | number)[] = [organizationId];

    if (options.feature_id) {
      sql += " AND m.feature_id = ?";
      args.push(options.feature_id);
    }

    if (options.service_account_id) {
      sql += " AND m.service_account_id = ?";
      args.push(options.service_account_id);
    }

    if (options.start) {
      sql += " AND m.timestamp >= ?";
      args.push(options.start);
    }

    if (options.end) {
      sql += " AND m.timestamp <= ?";
      args.push(options.end);
    }

    sql += " ORDER BY m.timestamp DESC";

    if (options.limit !== undefined) {
      sql += " LIMIT ?";
      args.push(options.limit);
    }

    if (options.offset !== undefined) {
      sql += " OFFSET ?";
      args.push(options.offset);
    }

    const result = await this.db.execute({ sql, args });
    return result.rows.map((row) => ({
      id: row.id as string,
      service_account_id: row.service_account_id as string,
      feature_id: row.feature_id as string,
      quantity: row.quantity as number,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
      timestamp: row.timestamp as number,
    }));
  }
}
