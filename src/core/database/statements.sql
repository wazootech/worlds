-- World Database Schema (world_*.db)
-- Isolated Data Plane for a single World.
-- Implements the "Normalized Statement Store" with Hexastore Indexing.

-- 1. Terms Table (The Dictionary)
-- Deduplicates IRIs, Literals, and Blank Nodes.
CREATE TABLE IF NOT EXISTS terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value TEXT NOT NULL,
  term_type TEXT NOT NULL, -- 'NamedNode', 'BlankNode', 'Literal', 'DefaultGraph'
  language TEXT NOT NULL DEFAULT '',
  datatype TEXT NOT NULL DEFAULT '',
  
  -- Ensure uniqueness of terms
  CONSTRAINT term_unique UNIQUE (value, term_type, language, datatype)
);

-- 2. Statements Tables (The Graph)
-- Hexastore Strategy: 3 Covered Indices for O(log N) lookups on any pattern.
-- We use 'statements' terminology as requested, but split into permutations.

-- (Subject, Predicate, Object)
CREATE TABLE IF NOT EXISTS statements_spo (
  subject_id INTEGER NOT NULL,
  predicate_id INTEGER NOT NULL,
  object_id INTEGER NOT NULL,
  graph_id INTEGER NOT NULL, -- Graph is usually implied, but we store it for specific quads support
  PRIMARY KEY (subject_id, predicate_id, object_id, graph_id),
  FOREIGN KEY (subject_id) REFERENCES terms(id),
  FOREIGN KEY (predicate_id) REFERENCES terms(id),
  FOREIGN KEY (object_id) REFERENCES terms(id),
  FOREIGN KEY (graph_id) REFERENCES terms(id)
) WITHOUT ROWID;

-- (Predicate, Object, Subject)
CREATE TABLE IF NOT EXISTS statements_pos (
  predicate_id INTEGER NOT NULL,
  object_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  graph_id INTEGER NOT NULL,
  PRIMARY KEY (predicate_id, object_id, subject_id, graph_id)
) WITHOUT ROWID;

-- (Object, Subject, Predicate)
CREATE TABLE IF NOT EXISTS statements_osp (
  object_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  predicate_id INTEGER NOT NULL,
  graph_id INTEGER NOT NULL,
  PRIMARY KEY (object_id, subject_id, predicate_id, graph_id)
) WITHOUT ROWID;

-- 3. Denormalized Statements Table (for Oxigraph hydration)
-- This table stores statements with string values directly for quick hydration.
-- Note: This is a simplified denormalized approach for the current implementation.
CREATE TABLE IF NOT EXISTS kb_statements (
  statement_id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  graph TEXT NOT NULL DEFAULT '',
  term_type TEXT NOT NULL DEFAULT 'NamedNode',
  object_language TEXT NOT NULL DEFAULT '',
  object_datatype TEXT NOT NULL DEFAULT ''
);

-- 4. Chunks Table (Vector Memory)
-- Stores text segments & embeddings derived from Literal Terms.
-- Source of Truth for RAG.
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_id INTEGER NOT NULL, -- The Literal Term this chunk belongs to
  text_content TEXT NOT NULL,
  FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
);

-- 5. Search Indices (RRF Support)

-- FTS5 Index (BM25)
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  text_content,
  content='chunks',
  content_rowid='id'
);

-- Vector Index (sqlite-vec)
-- Stores 512-dim embeddings for Cosine Similarity
-- Note: vec0 extension must be loaded for this to work. If not available, this will be skipped.
-- CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
--   embedding float[512]
-- );

-- 6. Triggers for Index Maintenance

-- FTS Triggers
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, text_content) VALUES (new.id, new.text_content);
END;

CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, text_content) VALUES ('delete', old.id, old.text_content);
END;

CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, text_content) VALUES ('delete', old.id, old.text_content);
  INSERT INTO chunks_fts(rowid, text_content) VALUES (new.id, new.text_content);
END;

-- Vector Triggers (Assuming app layer inserts embeddings manually into chunks_vec, 
-- but we can cascade deletes)
-- Note: Only create if chunks_vec table exists
-- CREATE TRIGGER IF NOT EXISTS chunks_vec_ad AFTER DELETE ON chunks BEGIN
--   DELETE FROM chunks_vec WHERE rowid = old.id;
-- END;

