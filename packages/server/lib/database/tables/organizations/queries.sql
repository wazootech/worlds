-- organizationsTable is a table where each organization owns
-- zero or more worlds.
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT,
  description TEXT,
  plan TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- selectOrganizations is a query that gets organizations with pagination
-- (used in GET /v1/organizations).
SELECT
  *
FROM
  organizations
WHERE
  deleted_at IS NULL
ORDER BY
  created_at DESC
LIMIT
  ? OFFSET ?;

-- insertOrganization is a query that inserts a new organization
-- (used in POST /v1/organizations).
INSERT INTO
  organizations (
    id,
    label,
    description,
    plan,
    created_at,
    updated_at,
    deleted_at
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?);

-- selectOrganizationById is a query that finds an organization by ID
-- (used in GET /v1/organizations/:organization and auth middleware).
SELECT
  *
FROM
  organizations
WHERE
  id = ?
  AND deleted_at IS NULL;

-- updateOrganization is a query that updates organization fields
-- (used in PUT /v1/organizations/:organization).
UPDATE
  organizations
SET
  label = ?,
  description = ?,
  plan = ?,
  updated_at = ?
WHERE
  id = ?;

-- deleteOrganization is a query that deletes an organization
-- (used in DELETE /v1/organizations/:organization).
DELETE FROM
  organizations
WHERE
  id = ?;
