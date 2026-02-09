import { z } from "zod";

/**
 * Metric represents a recorded metric.
 */
export interface Metric {
  id: string;
  serviceAccountId: string;
  featureId: string;
  quantity: number;
  metadata: Record<string, unknown> | null;
  timestamp: number;
}

/**
 * metricSchema is the Zod schema for Metric.
 */
export const metricSchema: z.ZodType<Metric> = z.object({
  id: z.string(),
  serviceAccountId: z.string(),
  featureId: z.string(),
  quantity: z.number(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  timestamp: z.number(),
});

/**
 * MetricMeterParams represents the parameters for metering a feature.
 */
export interface MetricMeterParams {
  featureId: string;
  quantity: number;
  serviceAccountId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * metricMeterParamsSchema is the Zod schema for MetricMeterParams.
 */
export const metricMeterParamsSchema: z.ZodType<MetricMeterParams> = z.object({
  featureId: z.string(),
  quantity: z.number(),
  serviceAccountId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * MetricListParams represents the parameters for listing metrics.
 */
export interface MetricListParams {
  page?: number;
  pageSize?: number;
  featureId?: string;
  serviceAccountId?: string;
  start?: number;
  end?: number;
}

/**
 * metricListParamsSchema is the Zod schema for MetricListParams.
 */
export const metricListParamsSchema: z.ZodType<MetricListParams> = z.object({
  featureId: z.string().optional(),
  serviceAccountId: z.string().optional(),
  start: z.number().optional(),
  end: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});
