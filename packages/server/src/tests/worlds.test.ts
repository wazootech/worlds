import { assert, assertEquals } from "@std/assert";
import { ulid } from "@std/ulid/ulid";
import { ApiKeyRepository, SecureWorlds, Worlds } from "@wazoo/worlds-sdk";
import type { SparqlSelectResult } from "@wazoo/worlds-sdk/schema";
import { createServer } from "#/server.ts";

Deno.test("World routes", async (t) => {
  const worlds = new Worlds();
  await using _ = {
    [Symbol.asyncDispose]: () => worlds[Symbol.asyncDispose](),
  };

  const apiKeyRepository = new ApiKeyRepository();
  const secureWorlds = new SecureWorlds({
    worlds,
    apiKeyRepository,
  });

  const server = createServer(secureWorlds);

  const adminWorlds = new Worlds({
    url: "http://localhost",
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      Promise.resolve(server.fetch(new Request(url, init))),
  });

  let world: string | null;

  await t.step("create world", async () => {
    const createdWorld = await adminWorlds.createWorld({
      id: "sdk-world-" + ulid(),
      displayName: "SDK World",
      description: "Test World",
    });
    assert(createdWorld.id !== undefined);
    assertEquals(createdWorld.displayName, "SDK World");
    world = createdWorld.id;
  });

  await t.step("list worlds pagination", async () => {
    const list1 = await adminWorlds.listWorlds({
      pageSize: 1,
    });
    assertEquals(list1.worlds.length, 1);

    const all = await adminWorlds.listWorlds({ pageSize: 10 });
    assert(all.worlds.length >= 1);
  });

  await t.step("get world", async () => {
    const result = await adminWorlds.getWorld({ source: { id: world! } });
    assert(result !== null);
    assertEquals(result.displayName, "SDK World");
  });

  await t.step("update world", async () => {
    await adminWorlds.updateWorld({
      source: { id: world! },
      description: "Updated Description",
    });
    const result = await adminWorlds.getWorld({ source: { id: world! } });
    assert(result !== null);
    assertEquals(result.description, "Updated Description");
  });

  await t.step("sparql update", async () => {
    const updateQuery = `
    INSERT DATA {
      <http://example.org/subject> <http://example.org/predicate> "Update Object" .
    }
  `;
    const result = await adminWorlds.sparql({
      sources: [{ id: world! }],
      query: updateQuery,
    });
    assertEquals(result, null);
  });

  await t.step("sparql query", async () => {
    const selectQuery = `
    SELECT ?s ?p ?o WHERE {
      <http://example.org/subject> <http://example.org/predicate> ?o
    }
  `;
    const result = (await adminWorlds.sparql({
      sources: [{ id: world! }],
      query: selectQuery,
    })) as SparqlSelectResult;
    assert(result.results.bindings.length > 0);
    assertEquals(result.results.bindings[0].o.value, "Update Object");
  });

  await t.step("import world", async () => {
    const turtleData =
      '<http://example.org/subject2> <http://example.org/predicate> "Imported Object" .';
    await adminWorlds.import({
      source: { id: world! },
      data: turtleData,
      contentType: "text/turtle",
    });
  });

  await t.step("export world", async () => {
    const nQuadsBuffer = await adminWorlds.export({ source: { id: world! } });
    const nQuads = new TextDecoder().decode(nQuadsBuffer);
    assert(nQuads.includes("http://example.org/subject"));

    const turtleBuffer = await adminWorlds.export({
      source: { id: world! },
      contentType: "text/turtle",
    });
    const turtle = new TextDecoder().decode(turtleBuffer);
    assert(turtle.includes("<http://example.org/subject>"));
  });

  await t.step("delete world", async () => {
    await adminWorlds.deleteWorld({ source: { id: world! } });
    const result = await adminWorlds.getWorld({ source: { id: world! } });
    assertEquals(result, null);
  });
});
