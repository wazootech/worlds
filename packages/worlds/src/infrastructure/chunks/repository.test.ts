import { assertEquals } from "@std/assert";
import { ChunksRepository } from "./repository.ts";
import type { ChunkId, ChunkRowUpsert } from "#/resources/table.types.ts";

Deno.test("ChunksRepository", async (t) => {
  await t.step("upsert stores chunk", () => {
    const repo = new ChunksRepository("world-1");

    const chunk: ChunkRowUpsert = {
      id: "chunk-1" as ChunkId,
      fact_id: "fact-1",
      subject: "http://example.org/s",
      predicate: "http://example.org/p",
      text: "Test chunk text",
      vector: null,
    };

    repo.upsert(chunk);

    const chunks = repo.getForWorld();
    assertEquals(chunks.length, 1);
    assertEquals(chunks[0].text, "Test chunk text");
  });

  await t.step("upsert replaces existing chunk", () => {
    const repo = new ChunksRepository("world-2");

    repo.upsert({
      id: "chunk-2" as ChunkId,
      fact_id: "fact-2",
      subject: "http://example.org/s",
      predicate: "http://example.org/p",
      text: "Original",
      vector: null,
    });

    repo.upsert({
      id: "chunk-2" as ChunkId,
      fact_id: "fact-2",
      subject: "http://example.org/s",
      predicate: "http://example.org/p",
      text: "Updated",
      vector: null,
    });

    const chunks = repo.getForWorld();
    assertEquals(chunks.length, 1);
    assertEquals(chunks[0].text, "Updated");
  });

  await t.step("per-world isolation", () => {
    const repo1 = new ChunksRepository("world-a");
    const repo2 = new ChunksRepository("world-b");

    repo1.upsert({
      id: "chunk-a" as ChunkId,
      fact_id: "fact-a",
      subject: "http://example.org/s",
      predicate: "http://example.org/p",
      text: "World A chunk",
      vector: null,
    });

    repo2.upsert({
      id: "chunk-b" as ChunkId,
      fact_id: "fact-b",
      subject: "http://example.org/s",
      predicate: "http://example.org/p",
      text: "World B chunk",
      vector: null,
    });

    const chunks1 = repo1.getForWorld();
    const chunks2 = repo2.getForWorld();

    assertEquals(chunks1.length, 1);
    assertEquals(chunks1[0].text, "World A chunk");
    assertEquals(chunks2.length, 1);
    assertEquals(chunks2[0].text, "World B chunk");
  });

  await t.step("getForWorld returns all chunks for world", () => {
    const repo = new ChunksRepository("world-3");

    repo.upsert({
      id: "chunk-3a" as ChunkId,
      fact_id: "fact-3a",
      subject: "http://example.org/s1",
      predicate: "http://example.org/p1",
      text: "Text 1",
      vector: null,
    });

    repo.upsert({
      id: "chunk-3b" as ChunkId,
      fact_id: "fact-3b",
      subject: "http://example.org/s2",
      predicate: "http://example.org/p2",
      text: "Text 2",
      vector: null,
    });

    const chunks = repo.getForWorld();
    assertEquals(chunks.length, 2);
  });
});
