-- rateLimitsTable is the table for storing rate limit bucket tokens
CREATE TABLE IF NOT EXISTS rate_limits (
  KEY TEXT PRIMARY KEY NOT NULL,
  tokens REAL NOT NULL,
  last_refill INTEGER NOT NULL
);

-- selectRateLimitByKey retrieves a rate limit bucket by its key
SELECT
  KEY,
  tokens,
  last_refill
FROM
  rate_limits
WHERE
  KEY = ?;

-- insertRateLimit inserts a new rate limit bucket
INSERT INTO
  rate_limits (KEY, tokens, last_refill)
VALUES
  (?, ?, ?);

-- updateRateLimit updates a rate limit bucket's tokens and last refill time
UPDATE
  rate_limits
SET
  tokens = ?,
  last_refill = ?
WHERE
  KEY = ?;
