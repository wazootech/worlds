import type { Client } from "@libsql/client";
import {
  tenantsApiKeyIndex,
  tenantsTable,
} from "./resources/tenants/queries.sql.ts";
import {
  tokenBucketsTable,
  tokenBucketsTenantIdIndex,
} from "./resources/token-buckets/queries.sql.ts";
import {
  worldsTable,
  worldsTenantIdIndex,
} from "./resources/worlds/queries.sql.ts";
import {
  invitesRedeemedByIndex,
  invitesTable,
} from "./resources/invites/queries.sql.ts";
import {
  documentsAccessIndex,
  documentsFtsDeleteTrigger,
  documentsFtsInsertTrigger,
  documentsFtsTable,
  documentsFtsUpdateTrigger,
  documentsTable,
  documentsVectorIndex,
} from "./resources/search-documents/queries.sql.ts";

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

  // Create search documents tables and indexes
  await client.batch([
    { sql: documentsTable },
    { sql: documentsAccessIndex },
    { sql: documentsVectorIndex },
    { sql: documentsFtsTable },
    { sql: documentsFtsInsertTrigger },
    { sql: documentsFtsDeleteTrigger },
    { sql: documentsFtsUpdateTrigger },
  ], "write");
}
