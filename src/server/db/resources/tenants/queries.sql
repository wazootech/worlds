-- tenantsTable is a table where each tenant owns
-- zero or more worlds.
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT,
  description TEXT,
  plan TEXT,
  api_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- tenantsApiKeyIndex is an index on api_key for secondary lookups.
CREATE INDEX IF NOT EXISTS idx_tenants_api_key ON tenants(api_key);

-- tenantsGetMany is a query that gets tenants with pagination
-- (used in GET /v1/tenants).
SELECT
  *
FROM
  tenants
WHERE
  deleted_at IS NULL
ORDER BY
  created_at DESC
LIMIT
  ? OFFSET ?;

-- tenantsAdd is a query that inserts a new tenant
-- (used in POST /v1/tenants).
INSERT INTO
  tenants (
    id,
    label,
    description,
    plan,
    api_key,
    created_at,
    updated_at,
    deleted_at
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?);

-- tenantsFind is a query that finds a tenant by ID
-- (used in GET /v1/tenants/:tenant and auth middleware).
SELECT
  *
FROM
  tenants
WHERE
  id = ?
  AND deleted_at IS NULL;

-- tenantsFindByApiKey is a query that finds a tenant by API key
-- (used in auth middleware).
SELECT
  *
FROM
  tenants
WHERE
  api_key = ?
  AND deleted_at IS NULL;

-- tenantsUpdate is a query that updates tenant fields
-- (used in PUT /v1/tenants/:tenant).
UPDATE
  tenants
SET
  label = ?,
  description = ?,
  plan = ?,
  updated_at = ?
WHERE
  id = ?;

-- tenantsRotateApiKey is a query that rotates a tenant API key
-- (used in POST /v1/tenants/:tenant/rotate).
UPDATE
  tenants
SET
  api_key = ?,
  updated_at = ?
WHERE
  id = ?;

-- tenantsDelete is a query that deletes a tenant
-- (used in DELETE /v1/tenants/:tenant).
DELETE FROM
  tenants
WHERE
  id = ?;
