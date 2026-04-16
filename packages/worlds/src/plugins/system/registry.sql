-- namespaces table: stores tenant namespaces
CREATE TABLE IF NOT EXISTS namespaces (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- selectNamespaceById retrieves a namespace by its ID.
SELECT id, label, created_at, updated_at FROM namespaces WHERE id = ?;

-- selectAllNamespaces retrieves all namespaces with cursor-based pagination.
-- cursor is encoded as created_at:id
SELECT id, label, created_at, updated_at FROM namespaces
WHERE (? IS NULL OR (created_at < ? OR (created_at = ? AND id < ?)))
ORDER BY created_at DESC, id DESC
LIMIT ?;

-- insertNamespace creates a new namespace (idempotent).
INSERT OR IGNORE INTO namespaces (id, label, created_at, updated_at) VALUES (?, ?, ?, ?);

-- updateNamespace updates a namespace's label.
UPDATE namespaces SET label = ?, updated_at = ? WHERE id = ?;

-- deleteNamespace removes a namespace by its ID.
DELETE FROM namespaces WHERE id = ?;

-- api_keys table: stores API keys (key_hash = SHA256 of the API key)
CREATE TABLE IF NOT EXISTS api_keys (
  key_hash TEXT PRIMARY KEY,
  namespace TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (namespace) REFERENCES namespaces(id) ON DELETE CASCADE
);

-- selectNamespaceByApiKey retrieves a namespace by hashed API key.
SELECT namespace FROM api_keys WHERE key_hash = ?;

-- insertApiKey creates a new API key (idempotent).
INSERT OR IGNORE INTO api_keys (key_hash, namespace, created_at) VALUES (?, ?, ?);

-- deleteApiKey removes an API key.
DELETE FROM api_keys WHERE key_hash = ?;

-- worlds table: stores world metadata per namespace
CREATE TABLE IF NOT EXISTS worlds (
  rowid INTEGER PRIMARY KEY,
  namespace TEXT,
  id TEXT,
  label TEXT NOT NULL,
  description TEXT,
  db_hostname TEXT,
  db_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE (namespace, id),
  FOREIGN KEY (namespace) REFERENCES namespaces(id) ON DELETE CASCADE
);

-- selectWorldById retrieves a world by id and namespace.
SELECT namespace, id, label, description, db_hostname, db_token, created_at, updated_at, deleted_at
FROM worlds
WHERE id IS ? AND namespace IS ? AND deleted_at IS NULL;

-- selectWorldByIdInternal retrieves a world by id without namespace scoping.
SELECT namespace, id, label, description, db_hostname, db_token, created_at, updated_at, deleted_at
FROM worlds
WHERE id IS ? AND deleted_at IS NULL;

-- selectAllWorlds retrieves worlds for a specific namespace with cursor-based pagination.
-- cursor is encoded as created_at:id
SELECT namespace, id, label, description, db_hostname, db_token, created_at, updated_at, deleted_at
FROM worlds
WHERE namespace IS ? AND deleted_at IS NULL
AND (? IS NULL OR (created_at < ? OR (created_at = ? AND id < ?)))
ORDER BY created_at DESC, id DESC
LIMIT ?;

-- insertWorld creates a new world.
INSERT INTO worlds (namespace, id, label, description, db_hostname, db_token, created_at, updated_at, deleted_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- updateWorld updates world fields.
UPDATE worlds
SET label = ?, description = ?, db_hostname = ?, db_token = ?, updated_at = ?, deleted_at = ?
WHERE id IS ? AND namespace IS ?;

-- deleteWorld removes a world by id and namespace.
DELETE FROM worlds WHERE id IS ? AND namespace IS ?;