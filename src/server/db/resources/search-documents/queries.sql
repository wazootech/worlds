-- documentsTable is a table for search documents with vector embeddings
-- and multi-tenant support.
CREATE TABLE IF NOT EXISTS search_documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  world_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  embedding F32_BLOB(1536),
  UNIQUE(tenant_id, world_id, subject, predicate, object)
);

-- documentsAccessIndex is an index on tenant_id and world_id for efficient
-- filtering.
CREATE INDEX IF NOT EXISTS idx_search_documents_access ON search_documents(tenant_id, world_id);

-- documentsVectorIndex is a vector index for similarity search.
CREATE INDEX IF NOT EXISTS idx_search_documents_vector ON search_documents(libsql_vector_idx(embedding));

-- documentsFtsTable is an FTS5 virtual table for full-text search.
CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
  object,
  content = 'search_documents',
  content_rowid = 'rowid'
);

-- documentsFtsInsertTrigger is a trigger to sync FTS on insert.
CREATE TRIGGER IF NOT EXISTS search_documents_ai
AFTER
INSERT
  ON search_documents
BEGIN
INSERT INTO
  search_fts(rowid, object)
VALUES
  (new.rowid, new.object);

END;

-- documentsFtsDeleteTrigger is a trigger to sync FTS on delete.
CREATE TRIGGER IF NOT EXISTS search_documents_ad
AFTER
  DELETE ON search_documents
BEGIN
INSERT INTO
  search_fts(search_fts, rowid, object)
VALUES
  ('delete', old.rowid, old.object);

END;

-- documentsFtsUpdateTrigger is a trigger to sync FTS on update.
CREATE TRIGGER IF NOT EXISTS search_documents_au
AFTER
UPDATE
  ON search_documents
BEGIN
INSERT INTO
  search_fts(search_fts, rowid, object)
VALUES
  ('delete', old.rowid, old.object);

INSERT INTO
  search_fts(rowid, object)
VALUES
  (new.rowid, new.object);

END;

-- documentsDeleteTenant is a query that deletes all documents for a tenant.
DELETE FROM
  search_documents
WHERE
  tenant_id = ?;

-- documentsDeleteWorld is a query that deletes all documents for a world
-- within a tenant.
DELETE FROM
  search_documents
WHERE
  tenant_id = ?
  AND world_id = ?;

-- documentsDelete is a query that deletes a specific document by id, tenant,
-- and world.
DELETE FROM
  search_documents
WHERE
  id = ?
  AND tenant_id = ?
  AND world_id = ?;

-- documentsUpsert is a query that inserts or replaces a document with
-- embedding.
INSERT
  OR REPLACE INTO search_documents (
    id,
    tenant_id,
    world_id,
    subject,
    predicate,
    object,
    embedding
  )
VALUES
  (?, ?, ?, ?, ?, ?, vector32(?));

-- documentsSearch is a query that performs hybrid search using RRF
-- (Reciprocal Rank Fusion) combining FTS and vector search.
WITH vec_matches AS (
  SELECT
    id AS rowid,
    row_number() OVER (PARTITION BY NULL) AS rank_number
  FROM
    vector_top_k('idx_search_documents_vector', vector32(?), ?)
),
fts_matches AS (
  SELECT
    rowid,
    row_number() OVER (
      ORDER BY
        rank
    ) AS rank_number,
    rank AS score
  FROM
    search_fts
  WHERE
    search_fts MATCH ?
  LIMIT
    ?
), final AS (
  SELECT
    search_documents.tenant_id,
    search_documents.world_id,
    search_documents.subject,
    search_documents.predicate,
    search_documents.object,
    vec_matches.rank_number AS vec_rank,
    fts_matches.rank_number AS fts_rank,
    (
      COALESCE(1.0 / (60 + fts_matches.rank_number), 0.0) * 1.0 + COALESCE(1.0 / (60 + vec_matches.rank_number), 0.0) * 1.0
    ) AS combined_rank
  FROM
    fts_matches
    FULL OUTER JOIN vec_matches ON vec_matches.rowid = fts_matches.rowid
    JOIN search_documents ON search_documents.rowid = COALESCE(fts_matches.rowid, vec_matches.rowid)
  WHERE
    search_documents.tenant_id = ?
  ORDER BY
    combined_rank DESC
  LIMIT
    ?
)
SELECT
  *
FROM
  final;

-- documentsSearchByWorlds is a query that performs hybrid search with world
-- filtering using RRF.
WITH vec_matches AS (
  SELECT
    id AS rowid,
    row_number() OVER (PARTITION BY NULL) AS rank_number
  FROM
    vector_top_k('idx_search_documents_vector', vector32(?), ?)
),
fts_matches AS (
  SELECT
    rowid,
    row_number() OVER (
      ORDER BY
        rank
    ) AS rank_number,
    rank AS score
  FROM
    search_fts
  WHERE
    search_fts MATCH ?
  LIMIT
    ?
), final AS (
  SELECT
    search_documents.tenant_id,
    search_documents.world_id,
    search_documents.subject,
    search_documents.predicate,
    search_documents.object,
    vec_matches.rank_number AS vec_rank,
    fts_matches.rank_number AS fts_rank,
    (
      COALESCE(1.0 / (60 + fts_matches.rank_number), 0.0) * 1.0 + COALESCE(1.0 / (60 + vec_matches.rank_number), 0.0) * 1.0
    ) AS combined_rank
  FROM
    fts_matches
    FULL OUTER JOIN vec_matches ON vec_matches.rowid = fts_matches.rowid
    JOIN search_documents ON search_documents.rowid = COALESCE(fts_matches.rowid, vec_matches.rowid)
  WHERE
    search_documents.tenant_id = ?
    AND search_documents.world_id IN (?)
  ORDER BY
    combined_rank DESC
  LIMIT
    ?
)
SELECT
  *
FROM
  final;
