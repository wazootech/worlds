-- blobsTable is a singleton table to store the world's blob.
-- id=1 is enforced to ensure it's a singleton.
CREATE TABLE IF NOT EXISTS blobs (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  blob BLOB,
  updated_at INTEGER NOT NULL
);

-- selectBlob fetches the singleton world blob.
SELECT
  blob,
  updated_at
FROM
  blobs
WHERE
  id = 1;

-- upsertBlob inserts or updates the singleton world blob.
INSERT INTO
  blobs (id, blob, updated_at)
VALUES
  (1, ?, ?) ON CONFLICT(id) DO
UPDATE
SET
  blob = excluded.blob,
  updated_at = excluded.updated_at;
