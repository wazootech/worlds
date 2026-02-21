-- worldsTable initializes the worlds table.
CREATE TABLE IF NOT EXISTS worlds (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  db_hostname TEXT,
  db_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE(slug)
);

-- selectWorldById is a query that finds a world by ID
-- (used in GET /v1/worlds/:world).
SELECT
  id,
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

-- selectAllWorlds is a query that finds worlds without organization filtering.
SELECT
  id,
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
  deleted_at IS NULL
ORDER BY
  created_at DESC
LIMIT
  ? OFFSET ?;

-- insertWorld is a query that inserts a new world (used in POST /v1/worlds).
INSERT INTO
  worlds (
    id,
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
-- (used in PUT /v1/worlds/:world).
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
  id = ?;

-- deleteWorld is a query that deletes a world
-- (used in DELETE /v1/worlds/:world).
DELETE FROM
  worlds
WHERE
  id = ?;
