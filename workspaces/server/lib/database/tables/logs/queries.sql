-- logsTable is the table definition for system logs.
CREATE TABLE IF NOT EXISTS LOGS (
  id TEXT PRIMARY KEY,
  world_id TEXT,
  timestamp INTEGER NOT NULL,
  LEVEL TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT
);

-- logsWorldIdIndex is an index on world_id for faster filtering.
CREATE INDEX IF NOT EXISTS idx_logs_world_id ON LOGS(world_id);

-- logsTimestampIndex is an index on timestamp for time-based graphical queries and cleanup.
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON LOGS(timestamp);

-- logsAdd inserts a new log entry.
INSERT INTO
  LOGS (
    id,
    world_id,
    timestamp,
    LEVEL,
    message,
    metadata
  )
VALUES
  (?, ?, ?, ?, ?, ?);

-- logsListByWorld retrieves logs for a specific world, ordered by time descending.
SELECT
  *
FROM
  LOGS
WHERE
  world_id = ?
ORDER BY
  timestamp DESC
LIMIT
  ?;

-- logsListSince retrieves logs after a timestamp for streaming.
SELECT
  *
FROM
  LOGS
WHERE
  timestamp > ?
ORDER BY
  timestamp ASC
LIMIT
  ?;

-- logsDeleteExpired deletes logs older than a specific timestamp (TTL).
DELETE FROM
  LOGS
WHERE
  timestamp < ?;
