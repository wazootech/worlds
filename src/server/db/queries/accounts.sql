-- accountsTable
-- An account owns 0 or more worlds
-- TODO: Rename "accounts" to "tenants" to better reflect that it represents an organization/environment rather than a user
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    description TEXT,
    plan TEXT,
    api_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

-- accountsApiKeyIndex
-- Index on api_key for secondary lookups (was a kvdex secondary index)
CREATE INDEX IF NOT EXISTS idx_accounts_api_key ON accounts(api_key);

-- accountsGetMany
-- Get accounts with pagination (used in GET /v1/accounts)
SELECT * FROM accounts
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- accountsAdd
-- Insert a new account (used in POST /v1/accounts)
INSERT INTO accounts (id, description, plan, api_key, created_at, updated_at, deleted_at)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- accountsFind
-- Find account by ID (used in GET /v1/accounts/:account and auth middleware)
SELECT * FROM accounts
WHERE id = ? AND deleted_at IS NULL;

-- accountsFindByApiKey
-- Find account by API key (used in auth middleware)
SELECT * FROM accounts
WHERE api_key = ? AND deleted_at IS NULL;

-- accountsUpdate
-- Update account fields (used in PUT /v1/accounts/:account)
UPDATE accounts
SET description = ?, plan = ?, updated_at = ?
WHERE id = ?;

-- accountsRotateApiKey
-- Rotate account API key (used in POST /v1/accounts/:account/rotate)
UPDATE accounts
SET api_key = ?, updated_at = ?
WHERE id = ?;

-- accountsDelete
-- Delete account (used in DELETE /v1/accounts/:account)
DELETE FROM accounts
WHERE id = ?;
