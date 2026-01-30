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
      tokenBuckets: collection(tokenBucketSchema),
      worlds: collection(worldSchema, {
        indices: {
          accountId: "secondary",
        },
      }),
      worldBlobs: collection(worldBlobSchema, {
        encoder: jsonEncoder(),
      }),
      invites: collection(inviteSchema, {
        idGenerator: (invite) => invite.code,
        indices: {
          redeemedBy: "secondary",
        },
      }),
    },
  });
}

export type Account = z.infer<typeof accountSchema>;

// TODO: Rename "Account" to "Tenant" to better reflect that it represents an organization/environment rather than a user.

/**
 * accountSchema is the schema for an account.
 *
 * An account owns 0 or more worlds.
 */
export const accountSchema = z.object({
  id: z.string(),
  description: z.string().nullish(),
  plan: z.string().nullish(),
  apiKey: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullish(),
});

export type World = z.infer<typeof worldSchema>;

// TODO: Make accountId on worldSchema nullable to support admin-created
// (non-account scoped) worlds.

/**
 * worldSchema is the schema for a world.
 *
 * A world is owned by an account.
 */
export const worldSchema = z.object({
  accountId: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullish(),
  isPublic: z.boolean().nullish().default(false),
});

export type TokenBucket = z.infer<typeof tokenBucketSchema>;

/**
 * tokenBucketSchema is the schema for a token bucket.
 *
 * A token bucket implements the [Token Bucket](https://en.wikipedia.org/wiki/Token_bucket)
 * algorithm for rate limiting.
 */
export const tokenBucketSchema = z.object({
  accountId: z.string(),
  key: z.string(), // Composite key: worldId:resourceType
  tokens: z.number(),
  lastRefillAt: z.number(),
});

export type WorldBlob = z.infer<typeof worldBlobSchema>;

/**
 * worldBlobSchema is the schema for a world blob.
 *
 * A world blob is an RDF dataset encoded as a binary blob of data
 * associated with a world.
 */
export const worldBlobSchema = z.instanceof(Uint8Array);

export type Invite = z.infer<typeof inviteSchema>;

/**
 * inviteSchema is the schema for an invite.
 *
 * An invite allows a user with a nullish plan to be promoted to the free plan
 * upon redemption. Once redeemed, the invite cannot be used again.
 */
export const inviteSchema = z.object({
  code: z.string(),
  createdAt: z.number(),
  redeemedBy: z.string().nullish(),
  redeemedAt: z.number().nullish(),
});
