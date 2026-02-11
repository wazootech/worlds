-- triplesTable is a table for triples with vector embeddings.
CREATE TABLE IF NOT EXISTS triples (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  UNIQUE(subject, predicate, object)
);

-- deleteTriples is a query that deletes a specific triple by id.
DELETE FROM
  triples
WHERE
  id = ?;

-- upsertTriples is a query that inserts or replaces a triple with
-- embedding.
INSERT
  OR REPLACE INTO triples (
    id,
    subject,
    predicate,
    object
  )
VALUES
  (?, ?, ?, ?);
