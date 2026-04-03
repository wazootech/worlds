-- worldsTable initializes the worlds table.
CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY NOT NULL,
  namespace_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  db_hostname TEXT,
  db_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE(slug, namespace_id)
);

-- selectWorldById is a query that finds a world by ID
SELECT
  id,
  namespace_id,
  slug,
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
  AND namespace_id = ?
  AND deleted_at IS NULL;

-- selectWorldByIdInternal is a query that finds a world by ID without namespace scoping.
-- Use this ONLY for internal system operations where the ID has already been validated.
SELECT
  id,
  namespace_id,
  slug,
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

-- selectWorldBySlug is a query that finds a world by slug.
SELECT
  id,
  namespace_id,
  slug,
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
  slug = ?
  AND namespace_id = ?
  AND deleted_at IS NULL;

-- selectAllWorlds is a query that finds worlds for a specific namespace.
SELECT
  id,
  namespace_id,
  slug,
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
  namespace_id = ?
  AND deleted_at IS NULL
ORDER BY
  created_at DESC
LIMIT
  ? OFFSET ?;

-- insertWorld is a query that inserts a new world (used in POST /worlds).
INSERT INTO
  worlds (
    id,
    namespace_id,
    slug,
    label,
    description,
    db_hostname,
    db_token,
    created_at,
    updated_at,
    deleted_at
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- updateWorld is a query that updates world fields
-- (used in PUT /worlds/:world).
UPDATE
  worlds
SET
  slug = ?,
  label = ?,
  description = ?,
  updated_at = ?,
  db_hostname = ?,
  db_token = ?,
  deleted_at = ?
WHERE
  id = ?
  AND namespace_id = ?;

-- deleteWorld is a query that deletes a world
-- (used in DELETE /worlds/:world).
DELETE FROM
  worlds
WHERE
  id = ?
  AND namespace_id = ?;
