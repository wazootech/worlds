-- serviceAccountsTable definition.
CREATE TABLE IF NOT EXISTS service_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  label TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- serviceAccountsOrganizationIdIndex is an index on organization_id.
CREATE INDEX IF NOT EXISTS idx_service_accounts_organization_id ON service_accounts(organization_id);

-- serviceAccountsApiKeyIndex is an index on api_key.
CREATE INDEX IF NOT EXISTS idx_service_accounts_api_key ON service_accounts(api_key);

-- serviceAccountsAdd inserts a new service account.
INSERT INTO
  service_accounts (
    id,
    organization_id,
    api_key,
    label,
    description,
    created_at,
    updated_at
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?);

-- serviceAccountsGetById retrieves a service account by ID.
SELECT
  *
FROM
  service_accounts
WHERE
  id = ?;

-- serviceAccountsGetByApiKey retrieves a service account by API key.
SELECT
  *
FROM
  service_accounts
WHERE
  api_key = ?;

-- serviceAccountsListByOrganizationId retrieves all service accounts for an organization.
SELECT
  *
FROM
  service_accounts
WHERE
  organization_id = ?;

-- serviceAccountsUpdate updates a service account.
UPDATE
  service_accounts
SET
  label = ?,
  description = ?,
  updated_at = ?
WHERE
  id = ?;

-- serviceAccountsRemove deletes a service account.
DELETE FROM
  service_accounts
WHERE
  id = ?;
