-- entityTypesTable is a table for mapping entities to their types.
CREATE TABLE IF NOT EXISTS entity_types (
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  PRIMARY KEY (subject, type)
) WITHOUT ROWID;

-- entityTypesIndex is a composite index for efficient type-based filtering.
CREATE INDEX IF NOT EXISTS idx_entity_type_mapping ON entity_types (type, subject);

-- triplesTypeInsertTrigger is a trigger to sync entity_types after inserting an rdf:type triple.
CREATE TRIGGER IF NOT EXISTS triples_type_ai
AFTER INSERT ON triples
WHEN new.predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
BEGIN
  INSERT OR REPLACE INTO entity_types (subject, type) VALUES (new.subject, new.object);
END;

-- triplesTypeDeleteTrigger is a trigger to sync entity_types after deleting an rdf:type triple.
CREATE TRIGGER IF NOT EXISTS triples_type_ad
AFTER DELETE ON triples
WHEN old.predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
BEGIN
  DELETE FROM entity_types WHERE subject = old.subject AND type = old.object;
END;
