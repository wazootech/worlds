-- worldsTable initializes the worlds table.
CREATE TABLE IF NOT EXISTS worlds (
  namespace_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  db_hostname TEXT,
  db_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (namespace_id, slug)
);

-- selectWorldBySlug is a query that finds a world by slug.
SELECT
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

-- selectWorldBySlugInternal is a query that finds a world by slug without namespace scoping.
-- Use this ONLY for internal system operations where the slug has already been validated.
SELECT
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
  AND deleted_at IS NULL;

-- selectAllWorlds is a query that finds worlds for a specific namespace.
SELECT
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
  (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- updateWorld is a query that updates world fields
-- (used in PUT /worlds/:world).
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
  slug = ?
  AND namespace_id = ?;

-- deleteWorld is a query that deletes a world
-- (used in DELETE /worlds/:world).
DELETE FROM
  worlds
WHERE
  slug = ?
  AND namespace_id = ?;
