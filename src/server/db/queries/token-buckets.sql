-- tokenBucketsTable
-- Implements the Token Bucket algorithm for rate limiting
-- Reference: https://en.wikipedia.org/wiki/Token_bucket
CREATE TABLE IF NOT EXISTS token_buckets (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    key TEXT NOT NULL, -- Composite key: worldId:resourceType
    tokens REAL NOT NULL,
    last_refill_at INTEGER NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- tokenBucketsAccountIdIndex
-- Index on account_id for efficient lookups by account
CREATE INDEX IF NOT EXISTS idx_token_buckets_account_id ON token_buckets(account_id);

-- tokenBucketsFind
-- Find token bucket by key (used in rate limiter consume operation)
SELECT * FROM token_buckets
WHERE key = ?;

-- tokenBucketsUpsert
-- Insert or update token bucket (used in rate limiter atomic operations)
INSERT OR REPLACE INTO token_buckets (id, account_id, key, tokens, last_refill_at)
VALUES (?, ?, ?, ?, ?);

-- tokenBucketsDeleteByAccount
-- Delete all token buckets for an account (cleanup when account is deleted)
DELETE FROM token_buckets
WHERE account_id = ?;

-- tokenBucketsCleanupOld
-- Delete token buckets that haven't been used in a while (maintenance query)
DELETE FROM token_buckets
WHERE last_refill_at \u003c ?;
