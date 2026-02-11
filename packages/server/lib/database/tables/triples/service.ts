import type { Client } from "@libsql/client";
import { deleteTriples, upsertTriples } from "./queries.sql.ts";
import type { TripleTableUpsert } from "./schema.ts";

export class TriplesService {
  constructor(private readonly db: Client) {}

  async upsert(triple: TripleTableUpsert): Promise<void> {
    await this.db.execute({
      sql: upsertTriples,
      args: [triple.id, triple.subject, triple.predicate, triple.object],
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.execute({ sql: deleteTriples, args: [id] });
  }
}
