-- tokenBucketsTable implements the Token Bucket algorithm for rate limiting.
-- Reference: https://en.wikipedia.org/wiki/Token_bucket
CREATE TABLE IF NOT EXISTS token_buckets (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  KEY TEXT NOT NULL,  -- Composite key: worldId:resourceType
  tokens REAL NOT NULL,
  last_refill_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- tokenBucketsTenantIdIndex is an index on tenant_id for efficient lookups
-- by tenant.
CREATE INDEX IF NOT EXISTS idx_token_buckets_tenant_id ON token_buckets(tenant_id);

-- tokenBucketsFind is a query that finds a token bucket by key
-- (used in rate limiter consume operation).
SELECT
  *
FROM
  token_buckets
WHERE
  KEY = ?;

-- tokenBucketsUpsert is a query that inserts or updates a token bucket
-- (used in rate limiter atomic operations).
INSERT
  OR REPLACE INTO token_buckets (id, tenant_id, KEY, tokens, last_refill_at)
VALUES
  (?, ?, ?, ?, ?);

-- tokenBucketsDeleteByTenant is a query that deletes all token buckets for
-- a tenant (cleanup when tenant is deleted).
DELETE FROM
  token_buckets
WHERE
  tenant_id = ?;

-- tokenBucketsCleanupOld is a query that deletes token buckets that haven't
-- been used in a while (maintenance query).
DELETE FROM
  token_buckets
WHERE
  last_refill_at < ?;
