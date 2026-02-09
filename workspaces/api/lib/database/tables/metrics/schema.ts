import { z } from "zod";

/**
 * MetricRow represents a metric record as stored in the database.
 */
export interface MetricRow {
  id: string;
  service_account_id: string;
  feature_id: string;
  quantity: number;
  metadata: string | null;
  timestamp: number;
}

/**
 * metricRowSchema is the Zod schema for the metrics database table.
 * This represents the raw database row structure.
 */
export const metricRowSchema: z.ZodType<MetricRow> = z.object({
  id: z.string(),
  service_account_id: z.string(),
  feature_id: z.string(),
  quantity: z.number(),
  metadata: z.string().nullable(),
  timestamp: z.number(),
});

/**
 * Metric represents a metric record in the application.
 */
export interface Metric {
  id: string;
  service_account_id: string;
  feature_id: string;
  quantity: number;
  metadata?: Record<string, unknown> | null;
  timestamp: number;
}

/**
 * metricShape is the Zod shape for the metrics application object.
 * Metadata is parsed as JSON.
 */
const metricShape = z.object({
  id: z.string(),
  service_account_id: z.string(),
  feature_id: z.string(),
  quantity: z.number(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  timestamp: z.number(),
});

/**
 * metricSchema is the Zod schema for the metrics application object.
 */
export const metricSchema: z.ZodType<Metric> = metricShape;

/**
 * MetricInsert represents the data needed to insert a new metric.
 */
export type MetricInsert = Omit<Metric, "id" | "timestamp">;

/**
 * metricInsertSchema is the Zod schema for inserting a new metric.
 */
export const metricInsertSchema: z.ZodType<MetricInsert> = metricShape.omit({
  id: true,
  timestamp: true,
});
