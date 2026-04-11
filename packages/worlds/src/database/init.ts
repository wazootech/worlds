import type { Client } from "@libsql/client";
import { worldsTable } from "#/database/repositories/system/worlds/mod.ts";
import {
  chunksFtsDeleteTrigger,
  chunksFtsInsertTrigger,
  chunksFtsTable,
  chunksFtsUpdateTrigger,
  chunksPredicateIndex,
  chunksSubjectIndex,
  chunksTable,
  chunksTripleIdIndex,
  chunksVectorIndex,
} from "#/database/repositories/world/chunks/mod.ts";
import { triplesTable } from "#/database/repositories/world/triples/mod.ts";
import { blobsTable } from "#/database/repositories/world/blobs/mod.ts";

import {
  itemTypesIndex,
  itemTypesTable,
  triplesItemTypeDeleteTrigger,
  triplesItemTypeInsertTrigger,
} from "#/database/repositories/world/item-types/mod.ts";

/**
 * initializeDatabase creates all main tables and indexes if they don't exist.
 * @param client The database client.
 */
export async function initializeDatabase(client: Client): Promise<void> {
  // Create tables
  await client.execute(worldsTable);

  // Create indexes
}

/**
 * initializeWorldDatabase creates all world-specific tables and indexes if they don't exist.
 * @param client The database client.
 * @param dimensions The number of dimensions for the vector index.
 */
export async function initializeWorldDatabase(
  client: Client,
  dimensions: number,
): Promise<void> {
  const chunksTableWithDimensions = chunksTable.replace(
    "F32_BLOB(1536)",
    `F32_BLOB(${dimensions})`,
  );

  // Create tables
  await client.execute(chunksTableWithDimensions);
  await client.execute(chunksFtsTable);
  await client.execute(blobsTable);
  await client.execute(triplesTable);

  await client.execute(itemTypesTable);

  // Create indexes
  await client.execute(chunksTripleIdIndex);
  await client.execute(chunksSubjectIndex);
  await client.execute(chunksPredicateIndex);
  await client.execute(chunksVectorIndex);

  await client.execute(itemTypesIndex);

  // Create triggers
  await client.execute(chunksFtsInsertTrigger);
  await client.execute(chunksFtsDeleteTrigger);
  await client.execute(chunksFtsUpdateTrigger);
  await client.execute(triplesItemTypeInsertTrigger);
  await client.execute(triplesItemTypeDeleteTrigger);
}
