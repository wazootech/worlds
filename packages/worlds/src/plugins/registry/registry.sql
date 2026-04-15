-- namespaces table: stores tenant namespaces
CREATE TABLE IF NOT EXISTS namespaces (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- selectNamespaceById retrieves a namespace by its ID.
SELECT id, label, created_at, updated_at FROM namespaces WHERE id = ?;

-- selectAllNamespaces retrieves all namespaces with pagination.
SELECT id, label, created_at, updated_at FROM namespaces ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- insertNamespace creates a new namespace.
INSERT INTO namespaces (id, label, created_at, updated_at) VALUES (?, ?, ?, ?);

-- updateNamespace updates a namespace's label.
UPDATE namespaces SET label = ?, updated_at = ? WHERE id = ?;

-- deleteNamespace removes a namespace by its ID.
DELETE FROM namespaces WHERE id = ?;

-- api_keys table: stores API keys (key_hash = SHA256 of the API key)
CREATE TABLE IF NOT EXISTS api_keys (
  key_hash TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (namespace) REFERENCES namespaces(id) ON DELETE CASCADE
);

-- selectNamespaceByApiKey retrieves a namespace by hashed API key.
SELECT namespace FROM api_keys WHERE key_hash = ?;

-- insertApiKey creates a new API key.
INSERT INTO api_keys (key_hash, namespace, created_at) VALUES (?, ?, ?);

-- deleteApiKey removes an API key.
DELETE FROM api_keys WHERE key_hash = ?;

-- worlds table: stores world metadata per namespace
CREATE TABLE IF NOT EXISTS worlds (
  namespace TEXT NOT NULL,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  db_hostname TEXT,
  db_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (namespace, slug),
  FOREIGN KEY (namespace) REFERENCES namespaces(id) ON DELETE CASCADE
);

-- selectWorldBySlug retrieves a world by slug and namespace.
SELECT namespace, slug, label, description, db_hostname, db_token, created_at, updated_at, deleted_at
FROM worlds
WHERE slug = ? AND namespace = ? AND deleted_at IS NULL;

-- selectWorldBySlugInternal retrieves a world by slug without namespace scoping.
SELECT namespace, slug, label, description, db_hostname, db_token, created_at, updated_at, deleted_at
FROM worlds
WHERE slug = ? AND deleted_at IS NULL;

-- selectAllWorlds retrieves worlds for a specific namespace with pagination.
SELECT namespace, slug, label, description, db_hostname, db_token, created_at, updated_at, deleted_at
FROM worlds
WHERE namespace = ? AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- insertWorld creates a new world.
INSERT INTO worlds (namespace, slug, label, description, db_hostname, db_token, created_at, updated_at, deleted_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- updateWorld updates world fields.
UPDATE worlds
SET label = ?, description = ?, db_hostname = ?, db_token = ?, updated_at = ?, deleted_at = ?
WHERE slug = ? AND namespace = ?;

-- deleteWorld removes a world by slug and namespace.
DELETE FROM worlds WHERE slug = ? AND namespace = ?;