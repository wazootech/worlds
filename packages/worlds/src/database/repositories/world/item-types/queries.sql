-- itemTypesTable is a table for mapping entities to their types.
CREATE TABLE IF NOT EXISTS item_types (
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  PRIMARY KEY (subject, type)
) WITHOUT ROWID;

-- itemTypesIndex is a composite index for efficient type-based filtering.
CREATE INDEX IF NOT EXISTS idx_item_type_mapping ON item_types (type, subject);

-- triplesItemTypeInsertTrigger is a trigger to sync item_types after inserting an rdf:type triple.
CREATE TRIGGER IF NOT EXISTS triples_type_ai
AFTER INSERT ON triples
WHEN new.predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
BEGIN
  INSERT OR REPLACE INTO item_types (subject, type) VALUES (new.subject, new.object);
END;

-- triplesItemTypeDeleteTrigger is a trigger to sync item_types after deleting an rdf:type triple.
CREATE TRIGGER IF NOT EXISTS triples_type_ad
AFTER DELETE ON triples
WHEN old.predicate = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
BEGIN
  DELETE FROM item_types WHERE subject = old.subject AND type = old.object;
END;
