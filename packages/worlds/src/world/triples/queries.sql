-- triplesTable is a table for triples with vector embeddings.
-- Graph column stores the named graph URI (default graph if null).
-- Recommended max: 100K triples for in-memory N3 Store loading.
CREATE TABLE IF NOT EXISTS triples (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  graph TEXT DEFAULT '<default>',
  UNIQUE(subject, predicate, object, graph)
);

-- triplesGraphIndex is an index on graph for efficient graph-scoped queries.
CREATE INDEX IF NOT EXISTS idx_triples_graph ON triples(graph);

-- deleteTriples is a query that deletes a specific triple by id.
DELETE FROM triples WHERE id = ?;

-- upsertTriples is a query that inserts or replaces a triple with embedding.
INSERT OR REPLACE INTO triples (id, subject, predicate, object, graph)
VALUES (?, ?, ?, ?, ?);

-- selectTriplesByGraph is a query that selects all triples in a given graph.
SELECT * FROM triples WHERE graph = ?;

-- selectAllTriples is a query that selects all triples.
SELECT * FROM triples;
