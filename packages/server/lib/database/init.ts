import type { Client } from "@libsql/client";
import { organizationsTable } from "#/lib/database/tables/organizations/queries.sql.ts";
import {
  worldsOrganizationIdIndex,
  worldsTable,
} from "#/lib/database/tables/worlds/queries.sql.ts";
import {
  serviceAccountsApiKeyIndex,
  serviceAccountsOrganizationIdIndex,
  serviceAccountsTable,
} from "#/lib/database/tables/service-accounts/queries.sql.ts";
import { rateLimitsTable } from "#/lib/database/tables/rate-limits/queries.sql.ts";
import {
  metricsServiceAccountIdIndex,
  metricsTable,
} from "#/lib/database/tables/metrics/queries.sql.ts";
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
} from "#/lib/database/tables/chunks/queries.sql.ts";
import { triplesTable } from "#/lib/database/tables/triples/queries.sql.ts";
import { blobsTable } from "#/lib/database/tables/blobs/queries.sql.ts";
import {
  logsTable,
  logsTimestampIndex,
  logsWorldIdIndex,
} from "#/lib/database/tables/logs/queries.sql.ts";

/**
 * initializeDatabase creates all main tables and indexes if they don't exist.
 */
export async function initializeDatabase(client: Client): Promise<void> {
  // Create tables
  await client.execute(organizationsTable);
  await client.execute(worldsTable);
  await client.execute(serviceAccountsTable);
  await client.execute(rateLimitsTable);
  await client.execute(metricsTable);

  // Create indexes
  await client.execute(worldsOrganizationIdIndex);
  await client.execute(serviceAccountsOrganizationIdIndex);
  await client.execute(serviceAccountsApiKeyIndex);
  await client.execute(metricsServiceAccountIdIndex);
}

/**
 * initializeWorldDatabase creates all world-specific tables and indexes if they don't exist.
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
  await client.execute(logsTable);

  // Create indexes
  await client.execute(chunksTripleIdIndex);
  await client.execute(chunksSubjectIndex);
  await client.execute(chunksPredicateIndex);
  await client.execute(chunksVectorIndex);
  await client.execute(logsWorldIdIndex);
  await client.execute(logsTimestampIndex);

  // Create triggers
  await client.execute(chunksFtsInsertTrigger);
  await client.execute(chunksFtsDeleteTrigger);
  await client.execute(chunksFtsUpdateTrigger);
}
