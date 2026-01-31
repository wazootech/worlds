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
    is_public INTEGER DEFAULT 0, -- SQLite uses INTEGER for boolean: 0 = false, 1 = true
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- worldsTenantIdIndex
-- Index on tenant_id for secondary lookups
CREATE INDEX IF NOT EXISTS idx_worlds_tenant_id ON worlds(tenant_id);

-- worldsFind
-- Find world by ID (used in GET /v1/worlds/:world and SPARQL routes)
SELECT * FROM worlds
WHERE id = ? AND deleted_at IS NULL;

-- worldsFindByTenantId
-- Find worlds by tenant ID with pagination (used in GET /v1/worlds)
SELECT * FROM worlds
WHERE tenant_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- worldsAdd
-- Insert a new world (used in POST /v1/worlds)
INSERT INTO worlds (id, tenant_id, label, description, blob, created_at, updated_at, deleted_at, is_public)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- worldsUpdate
-- Update world fields (used in PUT /v1/worlds/:world)
UPDATE worlds
SET label = ?, description = ?, is_public = ?, updated_at = ?, blob = ?
WHERE id = ?;

-- worldsDelete
-- Delete world (used in DELETE /v1/worlds/:world)
DELETE FROM worlds
WHERE id = ?;
