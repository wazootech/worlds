import { z } from "zod";

/**
 * metricRowSchema is the Zod schema for the metrics database table.
 * This represents the raw database row structure.
 */
export const metricRowSchema = z.object({
  id: z.string(),
  service_account_id: z.string(),
  feature_id: z.string(),
  quantity: z.number(),
  metadata: z.string().nullable(),
  timestamp: z.number(),
});

/**
 * MetricRow represents a metric record as stored in the database.
 */
export type MetricRow = z.infer<typeof metricRowSchema>;

/**
 * metricSchema is the Zod schema for the metrics application object.
 * Metadata is parsed as JSON.
 */
export const metricSchema = z.object({
  id: z.string(),
  service_account_id: z.string(),
  feature_id: z.string(),
  quantity: z.number(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  timestamp: z.number(),
});

/**
 * Metric represents a metric record in the application.
 */
export type Metric = z.infer<typeof metricSchema>;

/**
 * metricInsertSchema is the Zod schema for inserting a new metric.
 */
export const metricInsertSchema = metricSchema.omit({
  id: true,
  timestamp: true,
});

/**
 * MetricInsert represents the data needed to insert a new metric.
 */
export type MetricInsert = z.infer<typeof metricInsertSchema>;
