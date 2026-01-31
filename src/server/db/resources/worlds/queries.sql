-- worldsTable is a table where each world is owned by a tenant.
-- TODO: Make tenant_id nullable to support admin-created (non-tenant scoped) worlds
CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY NOT NULL,
  tenant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  blob BLOB,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- worldsTenantIdIndex is an index on tenant_id for secondary lookups.
CREATE INDEX IF NOT EXISTS idx_worlds_tenant_id ON worlds(tenant_id);

-- selectWorldById is a query that finds a world by ID
-- (used in GET /v1/worlds/:world and SPARQL routes).
SELECT
  id,
  tenant_id,
  label,
  description,
  created_at,
  updated_at,
  deleted_at
FROM
  worlds
WHERE
  id = ?
  AND deleted_at IS NULL;

-- selectWorldByIdWithBlob is a query that finds a world by ID and includes the blob
-- (used in binary download and SPARQL routes).
SELECT
  *
FROM
  worlds
WHERE
  id = ?
  AND deleted_at IS NULL;

-- selectWorldsByTenantId is a query that finds worlds by tenant ID with
-- pagination (used in GET /v1/worlds).
SELECT
  id,
  tenant_id,
  label,
  description,
  created_at,
  updated_at,
  deleted_at
FROM
  worlds
WHERE
  tenant_id = ?
  AND deleted_at IS NULL
ORDER BY
  created_at DESC
LIMIT
  ? OFFSET ?;

-- insertWorld is a query that inserts a new world (used in POST /v1/worlds).
INSERT INTO
  worlds (
    id,
    tenant_id,
    label,
    description,
    blob,
    created_at,
    updated_at,
    deleted_at
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?);

-- updateWorld is a query that updates world fields
-- (used in PUT /v1/worlds/:world).
UPDATE
  worlds
SET
  label = ?,
  description = ?,
  updated_at = ?,
  blob = ?
WHERE
  id = ?;

-- deleteWorld is a query that deletes a world
-- (used in DELETE /v1/worlds/:world).
DELETE FROM
  worlds
WHERE
  id = ?;
