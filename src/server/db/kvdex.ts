import { collection, kvdex } from "@olli/kvdex";
import { jsonEncoder } from "@olli/kvdex/encoding/json";
import { z } from "zod";

/**
 * WorldsKvdex is the type of the kvdex for the Worlds API.
 */
export type WorldsKvdex = ReturnType<typeof createWorldsKvdex>;

/**
 * createWorldsKvdex returns the kvdex instance for the Worlds API.
 *
 * @see https://github.com/oliver-oloughlin/kvdex
 */
export function createWorldsKvdex(kv: Deno.Kv) {
  return kvdex({
    kv: kv,
    schema: {
      accounts: collection(accountSchema, {
        idGenerator: (account) => account.id,
        indices: {
          apiKey: "secondary",
        },
      }),
      usageBuckets: collection(usageBucketSchema, {
        indices: {
          accountId: "secondary",
          worldId: "secondary",
        },
      }),
      plans: collection(planSchema, {
        idGenerator: (plan) => plan.planType,
      }),
      worlds: collection(worldSchema, {
        indices: {
          accountId: "secondary",
        },
      }),
      worldBlobs: collection(worldBlobSchema, {
        encoder: jsonEncoder(),
      }),
    },
  });
}

export type Plan = z.infer<typeof planSchema>;

export const planSchema = z.object({
  planType: z.string(),
  quotaRequestsPerMin: z.number().default(60),
  quotaStorageBytes: z.number().default(104857600),
});

export type Account = z.infer<typeof accountSchema>;

export const accountSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  planType: z.string(),
  apiKey: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type World = z.infer<typeof worldSchema>;

export const worldSchema = z.object({
  accountId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  isPublic: z.boolean().default(false),
});

export type UsageBucket = z.infer<typeof usageBucketSchema>;

export const usageBucketSchema = z.object({
  accountId: z.string(),
  worldId: z.string(),
  bucketStartTs: z.number(),
  requestCount: z.number().default(0),
});

export type WorldBlob = z.infer<typeof worldBlobSchema>;

export const worldBlobSchema = z.instanceof(Uint8Array);
