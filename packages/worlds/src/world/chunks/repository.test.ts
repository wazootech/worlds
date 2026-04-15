import { assertEquals } from "@std/assert";

import {
  createTestContext,
  createTestNamespace,
} from "#/core/engine-context.ts";
import { TriplesRepository } from "#/world/triples/repository.ts";
import { WorldsRepository } from "#/plugins/registry/worlds.repository.ts";
import { NamespacesRepository } from "#/plugins/registry/namespaces.repository.ts";
import { ChunksRepository } from "#/world/chunks/repository.ts";
import { ChunksSearchRepository } from "#/world/chunks/repository.ts";

Deno.test("ChunksSearchRepository", async (t) => {
  const testContext = await createTestContext();
  const worldsRepository = new WorldsRepository(testContext.libsql.database);
  const namespacesRepository = new NamespacesRepository(
    testContext.libsql.database,
  );
  const chunksSearchRepository = new ChunksSearchRepository(
    testContext,
    worldsRepository,
  );

  const { id: namespaceId } = await createTestNamespace(testContext, {
    plan: "free",
  });

  const now = Date.now();
  await namespacesRepository.insert({
    id: namespaceId,
    label: namespaceId,
    created_at: now,
    updated_at: now,
  });

  const world = "test-world";
  await worldsRepository.insert({
    namespace: namespaceId,
    world,
    label: "Test World",
    description: "Test Description",
    db_hostname: null,
    db_token: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  await testContext.libsql.manager.create({ world, namespace: namespaceId });

  const worldManaged = await testContext.libsql.manager.get({
    world,
    namespace: namespaceId,
  });
  const triplesRepository = new TriplesRepository(worldManaged.database);

  await t.step("search with no results", async () => {
    const results = await chunksSearchRepository.search({
      query: "nonexistent",
      world: world,
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
      graph: "<default>",
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
      world: world,
      namespace: namespaceId,
    });

    assertEquals(results.length, 1);
    assertEquals(results[0].subject, "s");
    assertEquals(results[0].object, "o");
  });

  await testContext.libsql.manager.close();
  testContext.libsql.database.close();
});
