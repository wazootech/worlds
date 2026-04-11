import type { Client } from "@libsql/client";
import { deleteTriples, upsertTriples } from "./queries.sql.ts";
import type { TripleTableUpsert } from "./schema.ts";

/**
 * TriplesRepository handles the persistence of original RDF triples.
 */
export class TriplesRepository {
  /**
   * constructor initializes the TriplesRepository with a database client.
   * @param db The database client.
   */
  constructor(private readonly db: Client) {}

  /**
   * upsert inserts or replaces a triple record.
   * @param triple The triple data to upsert.
   */
  async upsert(triple: TripleTableUpsert): Promise<void> {
    await this.db.execute({
      sql: upsertTriples,
      args: [triple.id, triple.subject, triple.predicate, triple.object],
    });
  }

  /**
   * delete removes a triple record by its ID.
   * @param id The ID of the triple to delete.
   */
  async delete(id: string): Promise<void> {
    await this.db.execute({ sql: deleteTriples, args: [id] });
  }
}

