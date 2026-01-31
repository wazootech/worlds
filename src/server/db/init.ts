import type { Client } from "@libsql/client";
import { accountsApiKeyIndex, accountsTable } from "./queries/accounts.sql.ts";
import {
  tokenBucketsAccountIdIndex,
  tokenBucketsTable,
} from "./queries/token-buckets.sql.ts";
import { worldsAccountIdIndex, worldsTable } from "./queries/worlds.sql.ts";
import { invitesRedeemedByIndex, invitesTable } from "./queries/invites.sql.ts";

/**
 * initializeDatabase creates all tables and indexes if they don't exist.
 */
export async function initializeDatabase(client: Client): Promise<void> {
  // Create tables
  await client.execute(accountsTable);
  await client.execute(tokenBucketsTable);
  await client.execute(worldsTable);
  await client.execute(invitesTable);

  // Create indexes
  await client.execute(accountsApiKeyIndex);
  await client.execute(tokenBucketsAccountIdIndex);
  await client.execute(worldsAccountIdIndex);
  await client.execute(invitesRedeemedByIndex);
}
