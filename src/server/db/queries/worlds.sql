-- worldsTable
-- A world is owned by an account
-- TODO: Make account_id nullable to support admin-created (non-account scoped) worlds
CREATE TABLE IF NOT EXISTS worlds (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    is_public INTEGER DEFAULT 0, -- SQLite uses INTEGER for boolean: 0 = false, 1 = true
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- worldsAccountIdIndex
-- Index on account_id for secondary lookups (was a kvdex secondary index)
CREATE INDEX IF NOT EXISTS idx_worlds_account_id ON worlds(account_id);

-- worldsFind
-- Find world by ID (used in GET /v1/worlds/:world and SPARQL routes)
SELECT * FROM worlds
WHERE id = ? AND deleted_at IS NULL;

-- worldsFindByAccountId
-- Find worlds by account ID with pagination (used in GET /v1/worlds)
SELECT * FROM worlds
WHERE account_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- worldsAdd
-- Insert a new world (used in POST /v1/worlds)
INSERT INTO worlds (id, account_id, label, description, created_at, updated_at, deleted_at, is_public)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- worldsUpdate
-- Update world fields (used in PUT /v1/worlds/:world)
UPDATE worlds
SET label = ?, description = ?, is_public = ?, updated_at = ?
WHERE id = ?;

-- worldsDelete
-- Delete world (used in DELETE /v1/worlds/:world)
DELETE FROM worlds
WHERE id = ?;
