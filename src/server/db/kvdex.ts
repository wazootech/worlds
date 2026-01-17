import { z } from "zod";
import { collection, kvdex } from "@olli/kvdex";
import { jsonEncoder } from "@olli/kvdex/encoding/json";

// TODO: Migrate kvdex collextions to sqlite tables.

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
        idGenerator: (plan) => plan.name,
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

/**
 * planSchema is the schema for a plan.
 *
 * A plan defines the quota for a given account.
 */
export const planSchema = z.object({
  name: z.string(),
  quotaRequestsPerMin: z.number().default(60),
  quotaStorageBytes: z.number().default(104857600),
});

export type Account = z.infer<typeof accountSchema>;

/**
 * accountSchema is the schema for an account.
 *
 * An account owns 0 or more worlds.
 */
export const accountSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  plan: z.string().nullable(),
  apiKey: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export type World = z.infer<typeof worldSchema>;

/**
 * worldSchema is the schema for a world.
 *
 * A world is owned by an account.
 */
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

/**
 * usageBucketSchema is the schema for a usage bucket.
 *
 * A usage bucket tracks the number of requests made to a world in a given time window.
 */
export const usageBucketSchema = z.object({
  accountId: z.string(),
  worldId: z.string(),
  bucketStartTs: z.number(),
  requestCount: z.number().default(0),
});

export type WorldBlob = z.infer<typeof worldBlobSchema>;

/**
 * worldBlobSchema is the schema for a world blob.
 *
 * A world blob is an RDF dataset encoded as a binary blob of data
 * associated with a world.
 */
export const worldBlobSchema = z.instanceof(Uint8Array);
