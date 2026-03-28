import { assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";

import {
  createTestContext,
  createTestOrganization,
} from "#/lib/testing/context.ts";
import { TriplesRepository } from "#/lib/database/tables/triples/repository.ts";
import { WorldsRepository } from "#/lib/database/tables/worlds/repository.ts";
import { ChunksRepository, ChunksSearchRepository } from "./repository.ts";

Deno.test("ChunksSearchRepository", async (t) => {
  const testContext = await createTestContext();
  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  const chunksSearchRepository = new ChunksSearchRepository(
    testContext,
    worldsRepository,
  );

  await createTestOrganization(testContext, {
    plan: "free",
  });

  const worldId = ulid();
  const now = Date.now();
  await worldsRepository.insert({
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
  const triplesRepository = new TriplesRepository(worldManaged.database);

  await t.step("search with no results", async () => {
    const results = await chunksSearchRepository.search({
      query: "nonexistent",
      worldId,
    });
    assertEquals(results.length, 0);
  });

  await t.step("search with results", async () => {
    const tripleId = "t1";
    await triplesRepository.upsert({
      id: tripleId,
      subject: "s",
      predicate: "p",
      object: "o",
      vector: null,
    });

    const chunksRepository = new ChunksRepository(worldManaged.database);
    await chunksRepository.upsert({
      id: "c1",
      triple_id: tripleId,
      subject: "s",
      predicate: "p",
      text: "This is a test chunk about apples.",
      vector: new Uint8Array(new Float32Array(768).fill(0).buffer),
    });

    const results = await chunksSearchRepository.search({
      query: "apples",
      worldId,
    });

    assertEquals(results.length, 1);
    assertEquals(results[0].subject, "s");
    assertEquals(results[0].object, "o");
  });
});
