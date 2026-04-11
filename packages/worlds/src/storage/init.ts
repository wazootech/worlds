import type { Client } from "@libsql/client";
import { worldsTable } from "#/plugins/registry/worlds.queries.sql.ts";
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
} from "#/world/chunks/queries.sql.ts";
import { triplesTable } from "#/world/triples/queries.sql.ts";
import { blobsTable } from "#/world/blobs/queries.sql.ts";

import {
  itemTypesIndex,
  itemTypesTable,
  triplesItemTypeDeleteTrigger,
  triplesItemTypeInsertTrigger,
} from "#/world/item-types/queries.sql.ts";

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

