import { createClient } from "@libsql/client";
import { ulid } from "@std/ulid/ulid";
import { initializeDatabase } from "#/lib/database/init.ts";
import { MemoryDatabaseManager } from "#/lib/database/managers/memory.ts";
import { OrganizationsService } from "#/lib/database/tables/organizations/service.ts";
import type { Embeddings } from "#/lib/embeddings/embeddings.ts";
import { ServiceAccountsService } from "#/lib/database/tables/service-accounts/service.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import type { AppContext } from "#/context.ts";

export async function createTestContext(): Promise<AppContext> {
  const client = createClient({ url: ":memory:" });
  await initializeDatabase(client);

  const mockEmbeddings: Embeddings = {
    dimensions: 1536,
    embed: (texts: string | string[]) => {
      if (Array.isArray(texts)) {
        return Promise.resolve(Array(texts.length).fill(Array(1536).fill(0)));
      }
      return Promise.resolve(Array(1536).fill(0));
    },
  };

  const worldsService = new WorldsService(client);
  const databaseManager = new MemoryDatabaseManager(worldsService);

  return {
    database: client,
    embeddings: mockEmbeddings,
    databaseManager,
    admin: {
      apiKey: ulid(),
    },
  };
}

export async function createTestOrganization(
  context: AppContext,
  options?: { plan?: string },
): Promise<{ id: string; apiKey: string }> {
  const service = new OrganizationsService(context.database);
  const id = ulid();
  const now = Date.now();
  await service.add({
    id,
    label: "Test Org",
    description: "Description",
    plan: options?.plan ?? "free",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  // Return the admin API key for authentication, as org keys are no longer valid
  return { id, apiKey: context.admin!.apiKey };
}

export async function createTestServiceAccount(
  context: AppContext,
  organizationId: string,
): Promise<{ id: string; apiKey: string }> {
  const serviceAccountsService = new ServiceAccountsService(context.database);
  const accountId = ulid();
  const apiKey = ulid();
  const now = Date.now();
  await serviceAccountsService.add({
    id: accountId,
    organization_id: organizationId,
    label: "Test Service Account",
    description: null,
    api_key: apiKey,
    created_at: now,
    updated_at: now,
  });
  return { id: accountId, apiKey };
}
