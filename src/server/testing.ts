import { worldsKvdex } from "./db/kvdex.ts";
import type { AppContext } from "./app-context.ts";
import type { WorldsKvdex } from "./db/kvdex.ts";

/**
 * createTestContext creates a test context for the application.
 */
export async function createTestContext(): Promise<AppContext> {
  const kv = await Deno.openKv(":memory:");
  const db = worldsKvdex(kv);
  const apiKey = "admin-api-key";
  return {
    db,
    kv,
    admin: { apiKey },
  };
}

/**
 * createTestAccount creates a test account and returns its ID and API key.
 */
export async function createTestAccount(
  db: WorldsKvdex,
): Promise<{ id: string; apiKey: string }> {
  const id = crypto.randomUUID();
  const apiKey = crypto.randomUUID();
  const result = await db.accounts.add({
    id,
    description: "Test account",
    planType: "free",
    apiKey,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
  });
  if (!result.ok) {
    throw new Error("Failed to create test account");
  }

  return { id: result.id, apiKey };
}
