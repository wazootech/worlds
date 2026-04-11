import type { Client } from "@libsql/client";
import {
  deleteTriples,
  selectAllTriples,
  selectTriplesByGraph,
  upsertTriples,
} from "./queries.sql.ts";
import type { TripleTableUpsert } from "./schema.ts";

const DEFAULT_GRAPH = "<default>";

/**
 * TriplesRepository handles the persistence of original RDF triples.
 */
export class TriplesRepository {
  constructor(private readonly db: Client) {}

  /**
   * upsert inserts or replaces a triple record.
   */
  async upsert(triple: TripleTableUpsert): Promise<void> {
    await this.db.execute({
      sql: upsertTriples,
      args: [
        triple.id,
        triple.subject,
        triple.predicate,
        triple.object,
        triple.graph ?? DEFAULT_GRAPH,
      ],
    });
  }

  /**
   * delete removes a triple record by its ID.
   */
  async delete(id: string): Promise<void> {
    await this.db.execute({ sql: deleteTriples, args: [id] });
  }

  /**
   * getAll retrieves all triples from the database.
   */
  async getAll(): Promise<TripleTableUpsert[]> {
    const result = await this.db.execute({ sql: selectAllTriples, args: [] });
    return result.rows as unknown as TripleTableUpsert[];
  }

  /**
   * getByGraph retrieves all triples in a given graph.
   */
  async getByGraph(graph: string): Promise<TripleTableUpsert[]> {
    const result = await this.db.execute({
      sql: selectTriplesByGraph,
      args: [graph],
    });
    return result.rows as unknown as TripleTableUpsert[];
  }
}

