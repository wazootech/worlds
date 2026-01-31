-- invitesTable is a table where each invite allows a user to be promoted to the free plan.
-- An invite allows a user with a nullish plan to be promoted to the free plan
-- upon redemption. Once redeemed, the invite cannot be used again.
CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  redeemed_by TEXT,
  redeemed_at INTEGER
);

-- invitesRedeemedByIndex is an index on redeemed_by for secondary lookups
-- (was a kvdex secondary index).
CREATE INDEX IF NOT EXISTS idx_invites_redeemed_by ON invites(redeemed_by);

-- invitesGetMany is a query that gets invites with pagination
-- (used in GET /v1/invites).
SELECT
  *
FROM
  invites
ORDER BY
  created_at DESC
LIMIT
  ? OFFSET ?;

-- invitesAdd is a query that inserts a new invite
-- (used in POST /v1/invites).
INSERT INTO
  invites (code, created_at, redeemed_by, redeemed_at)
VALUES
  (?, ?, ?, ?);

-- invitesFind is a query that finds an invite by code
-- (used in GET /v1/invites/:code and POST /v1/invites/:code/redeem).
SELECT
  *
FROM
  invites
WHERE
  code = ?;

-- invitesUpdate is a query that updates an invite (mark as redeemed in
-- POST /v1/invites/:code/redeem).
UPDATE
  invites
SET
  redeemed_by = ?,
  redeemed_at = ?
WHERE
  code = ?;

-- invitesDelete is a query that deletes an invite
-- (used in DELETE /v1/invites/:code).
DELETE FROM
  invites
WHERE
  code = ?;
