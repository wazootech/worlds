-- metricsTable is the table for storing usage metrics
CREATE TABLE IF NOT EXISTS metrics (
  id TEXT PRIMARY KEY NOT NULL,
  service_account_id TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  metadata TEXT,
  timestamp INTEGER NOT NULL
);

-- metricsServiceAccountIdIndex is an index on service_account_id
CREATE INDEX IF NOT EXISTS idx_metrics_service_account_id ON metrics(service_account_id);

-- insertMetric inserts a new metric record
INSERT INTO
  metrics (
    id,
    service_account_id,
    feature_id,
    quantity,
    metadata,
    timestamp
  )
VALUES
  (?, ?, ?, ?, ?, ?);

-- selectLastMetric retrieves the most recent metric for a service account and feature
SELECT
  *
FROM
  metrics
WHERE
  service_account_id = ?
  AND feature_id = ?
ORDER BY
  timestamp DESC
LIMIT
  1;

-- selectMetricsByOrganization retrieves all metrics for a given organization
SELECT
  m.*
FROM
  metrics m
JOIN
  service_accounts sa ON m.service_account_id = sa.id
WHERE
  sa.organization_id = ?
ORDER BY
  m.timestamp DESC;
