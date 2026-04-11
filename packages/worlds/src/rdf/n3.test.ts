// @deno-types="@types/n3"
import { DataFactory, Store } from "n3";
import { assertEquals } from "@std/assert";
import { generateBlobFromN3Store, generateN3StoreFromBlob } from "./n3.ts";

const { namedNode, literal, quad } = DataFactory;

Deno.test("N3 Layer", async (t) => {
  await t.step(
    "generateN3StoreFromBlob returns empty store for empty blob",
    async () => {
      const blob = new Blob([], { type: "application/n-quads" });
      const store = await generateN3StoreFromBlob(blob);
      assertEquals(store.size, 0);
    },
  );

  await t.step(
    "generateBlobFromN3Store and generateN3StoreFromBlob round trip",
    async () => {
      const store = new Store();
      store.addQuad(
        quad(
          namedNode("http://example.org/subject"),
          namedNode("http://example.org/predicate"),
          literal("object"),
        ),
      );

      const blob = await generateBlobFromN3Store(store);

      const resultStore = await generateN3StoreFromBlob(blob);
      assertEquals(resultStore.size, 1);
      const quads = resultStore.getQuads(null, null, null, null);
      assertEquals(quads[0].subject.value, "http://example.org/subject");
      assertEquals(quads[0].predicate.value, "http://example.org/predicate");
      assertEquals(quads[0].object.value, "object");
    },
  );
});
