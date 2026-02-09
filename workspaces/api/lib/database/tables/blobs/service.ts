import type { Client } from "@libsql/client";
import { selectBlob, upsertBlob } from "./queries.sql.ts";
import { type BlobRow, blobSchema } from "./schema.ts";

/**
 * BlobsService handles persistence of the world-scoped N-Quads blob.
 */
export class BlobsService {
  constructor(private readonly db: Client) {}

  /**
   * get fetches the current blob for the world.
   */
  async get(): Promise<BlobRow | null> {
    const result = await this.db.execute(selectBlob);
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return blobSchema.parse({
      blob: row.blob,
      updated_at: row.updated_at,
    });
  }

  /**
   * set updates the blob for the world.
   */
  async set(blob: Uint8Array, updatedAt: number): Promise<void> {
    await this.db.execute({
      sql: upsertBlob,
      args: [blob, updatedAt],
    });
  }
}
