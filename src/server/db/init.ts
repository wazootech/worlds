import type { Client } from "@libsql/client";
import { tenantsApiKeyIndex, tenantsTable } from "./queries/tenants.sql.ts";
import {
  tokenBucketsTable,
  tokenBucketsTenantIdIndex,
} from "./queries/token-buckets.sql.ts";
import { worldsTable, worldsTenantIdIndex } from "./queries/worlds.sql.ts";
import { invitesRedeemedByIndex, invitesTable } from "./queries/invites.sql.ts";

/**
 * initializeDatabase creates all tables and indexes if they don't exist.
 */
export async function initializeDatabase(client: Client): Promise<void> {
  // Create tables
  await client.execute(tenantsTable);
  await client.execute(tokenBucketsTable);
  await client.execute(worldsTable);
  await client.execute(invitesTable);

  // Create indexes
  await client.execute(tenantsApiKeyIndex);
  await client.execute(tokenBucketsTenantIdIndex);
  await client.execute(worldsTenantIdIndex);
  await client.execute(invitesRedeemedByIndex);
}
