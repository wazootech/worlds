-- chunksTable is a table for overlapping text chunks with vector embeddings.
-- Note: F32_BLOB(1536) is a placeholder replaced at runtime (see init.ts)
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  triple_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  text TEXT NOT NULL,
  vector F32_BLOB(1536),
  FOREIGN KEY(triple_id) REFERENCES triples(id) ON DELETE CASCADE
);

-- chunksTripleIdIndex is an index on triple_id for efficient retrieval.
CREATE INDEX IF NOT EXISTS idx_chunks_triple_id ON chunks(triple_id);

-- chunksSubjectIndex is an index on subject for efficient filtering.
CREATE INDEX IF NOT EXISTS idx_chunks_subject ON chunks(subject);

-- chunksPredicateIndex is an index on predicate for efficient filtering.
CREATE INDEX IF NOT EXISTS idx_chunks_predicate ON chunks(predicate);

-- chunksVectorIndex is a vector index for similarity search.
CREATE INDEX IF NOT EXISTS idx_chunks_vector ON chunks(libsql_vector_idx(vector));

-- chunksFtsTable is an FTS5 virtual table for full-text search.
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  text,
  content = 'chunks',
  content_rowid = 'rowid'
);

-- chunksFtsInsertTrigger is a trigger to sync FTS after insert.
CREATE TRIGGER IF NOT EXISTS chunks_ai
AFTER
INSERT
  ON chunks
BEGIN
INSERT INTO
  chunks_fts(rowid, text)
VALUES
  (new.rowid, new.text);

END;

-- chunksFtsDeleteTrigger is a trigger to sync FTS after delete.
CREATE TRIGGER IF NOT EXISTS chunks_ad
AFTER
  DELETE ON chunks
BEGIN
INSERT INTO
  chunks_fts(chunks_fts, rowid, text)
VALUES
  ('delete', old.rowid, old.text);

END;

-- chunksFtsUpdateTrigger is a trigger to sync FTS after update.
CREATE TRIGGER IF NOT EXISTS chunks_au
AFTER
UPDATE
  ON chunks
BEGIN
INSERT INTO
  chunks_fts(chunks_fts, rowid, text)
VALUES
  ('delete', old.rowid, old.text);

INSERT INTO
  chunks_fts(rowid, text)
VALUES
  (new.rowid, new.text);

END;

-- deleteChunks is a query that deletes a specific chunk by id.
DELETE FROM
  chunks
WHERE
  id = ?;

-- upsertChunks is a query that inserts or replaces a chunk with
-- embedding.
INSERT
  OR REPLACE INTO chunks (id, triple_id, subject, predicate, text, vector)
VALUES
  (?, ?, ?, ?, ?, vector32(?));

-- searchChunks is a query that performs hybrid search using RRF
-- (Reciprocal Rank Fusion) combining FTS and vector search.
WITH vec_matches AS (
  SELECT
    id AS rowid,
    row_number() OVER (PARTITION BY NULL) AS rank_number
  FROM
    vector_top_k('idx_chunks_vector', vector32(?), ?)
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
    chunks_fts
  WHERE
    chunks_fts MATCH ?
  LIMIT
    ?
), final AS (
  SELECT
    chunks.id,
    chunks.triple_id,
    chunks.subject,
    chunks.predicate,
    chunks.text,
    triples.object,
    vec_matches.rank_number AS vec_rank,
    fts_matches.rank_number AS fts_rank,
    (
      COALESCE(1.0 / (60 + fts_matches.rank_number), 0.0) * 1.0 + COALESCE(1.0 / (60 + vec_matches.rank_number), 0.0) * 1.0
    ) AS combined_rank
  FROM
    fts_matches
    FULL OUTER JOIN vec_matches ON vec_matches.rowid = fts_matches.rowid
    JOIN chunks ON chunks.rowid = COALESCE(fts_matches.rowid, vec_matches.rowid)
    JOIN triples ON triples.id = chunks.triple_id
  WHERE
    (
      ? IS NULL
      OR chunks.subject IN (
        SELECT
          value
        FROM
          json_each(?)
      )
    )
    AND (
      ? IS NULL
      OR chunks.predicate IN (
        SELECT
          value
        FROM
          json_each(?)
      )
    )
  ORDER BY
    combined_rank DESC
  LIMIT
    ?
)
SELECT
  *
FROM
  final;
