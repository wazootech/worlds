-- worldsTable is a table where each world is owned by an organization.
-- TODO: Make organization_id nullable to support admin-created (non-org scoped) worlds
CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  db_hostname TEXT,
  db_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- worldsOrganizationIdIndex is an index on organization_id for secondary lookups.
CREATE INDEX IF NOT EXISTS idx_worlds_organization_id ON worlds(organization_id);

-- selectWorldById is a query that finds a world by ID
-- (used in GET /v1/worlds/:world and SPARQL routes).
SELECT
  id,
  organization_id,
  label,
  description,
  db_hostname,
  db_token,
  created_at,
  updated_at,
  deleted_at
FROM
  worlds
WHERE
  id = ?
  AND deleted_at IS NULL;

-- selectWorldByIdWithBlob (deprecated, now same as selectWorldById)
SELECT
  id,
  organization_id,
  label,
  description,
  db_hostname,
  db_token,
  created_at,
  updated_at,
  deleted_at
FROM
  worlds
WHERE
  id = ?
  AND deleted_at IS NULL;

-- selectWorldsByOrganizationId is a query that finds worlds by organization ID with
-- pagination (used in GET /v1/worlds).
SELECT
  id,
  organization_id,
  label,
  description,
  db_hostname,
  db_token,
  created_at,
  updated_at,
  deleted_at
FROM
  worlds
WHERE
  organization_id = ?
  AND deleted_at IS NULL
ORDER BY
  created_at DESC
LIMIT
  ? OFFSET ?;

-- insertWorld is a query that inserts a new world (used in POST /v1/worlds).
INSERT INTO
  worlds (
    id,
    organization_id,
    label,
    description,
    db_hostname,
    db_token,
    created_at,
    updated_at,
    deleted_at
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- updateWorld is a query that updates world fields
-- (used in PUT /v1/worlds/:world).
UPDATE
  worlds
SET
  label = ?,
  description = ?,
  updated_at = ?,
  db_hostname = ?,
  db_token = ?,
  deleted_at = ?
WHERE
  id = ?;

-- deleteWorld is a query that deletes a world
-- (used in DELETE /v1/worlds/:world).
DELETE FROM
  worlds
WHERE
  id = ?;
