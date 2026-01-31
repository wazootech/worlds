import { z } from "zod";

/**
 * tokenBucketTableSchema is the Zod schema for the token_buckets database table.
 * This represents the raw database row structure.
 */
export const tokenBucketTableSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  KEY: z.string(),
  tokens: z.number(),
  last_refill_at: z.number(),
});

/**
 * TokenBucketTable represents a token bucket record as stored in the database.
 */
export type TokenBucketTable = z.infer<typeof tokenBucketTableSchema>;

/**
 * tokenBucketTableUpsertSchema is the Zod schema for inserting or updating a token bucket.
 */
export const tokenBucketTableUpsertSchema = tokenBucketTableSchema;

/**
 * TokenBucketTableUpsert represents the data needed to upsert a token bucket.
 */
export type TokenBucketTableUpsert = z.infer<
  typeof tokenBucketTableUpsertSchema
>;
