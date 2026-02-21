import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";

import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import { TriplesService } from "#/lib/database/tables/triples/service.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import { ChunkRepository, ChunksService } from "./service.ts";

Deno.test("ChunksService", async (t) => {
  const testContext = await createTestContext();
  const worldsService = new WorldsService(testContext.libsql.database);
  const chunksService = new ChunksService(testContext, worldsService);

  await createTestOrganization(testContext, {
    plan: "free",
  });

  const worldId = ulid();
  const now = Date.now();
  await worldsService.insert({
    id: worldId,
    slug: "test-world",
    label: "Test World",
    description: "Test Description",
    db_hostname: null,
    db_token: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  await testContext.libsql.manager.create(worldId);

  const worldManaged = await testContext.libsql.manager.get(worldId);
  const triplesService = new TriplesService(worldManaged.database);

  await t.step("search with no results", async () => {
    const results = await chunksService.search({
      query: "nonexistent",
      worldId,
    });
    assertEquals(results.length, 0);
  });

  await t.step("search with results", async () => {
    const tripleId = "t1";
    await triplesService.upsert({
      id: tripleId,
      subject: "s",
      predicate: "p",
      object: "o",
      vector: null,
    });

    const chunkRepo = new ChunkRepository(worldManaged.database);
    await chunkRepo.upsert({
      id: "c1",
      triple_id: tripleId,
      subject: "s",
      predicate: "p",
      text: "This is a test chunk about apples.",
      vector: new Uint8Array(new Float32Array(1536).fill(0).buffer),
    });

    const results = await chunksService.search({
      query: "apples",
      worldId,
    });

    assertEquals(results.length, 1);
    assertEquals(results[0].subject, "s");
    assertEquals(results[0].object, "o");
  });
});
