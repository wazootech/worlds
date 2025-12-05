import { assertEquals } from "@std/assert";
import { namedNode, quad, Store } from "oxigraph";
import { decodeStore, encodeStore } from "./oxigraph-encoding.ts";

Deno.test("encodeStore and decodeStore with gzip compression", async () => {
  const store = new Store();
  store.add(
    quad(
      namedNode("http://example.com/subject"),
      namedNode("http://example.com/predicate"),
      namedNode("http://example.com/object"),
    ),
  );

  const encoding = "application/n-quads";
  const compressionFormat = "gzip";

  // Encode with compression
  const encoded = await encodeStore(
    store,
    encoding,
    new CompressionStream(compressionFormat),
  );

  // Verify it's a Uint8Array
  assertEquals(encoded instanceof Uint8Array, true);

  // Decode with decompression
  const decodedStore = await decodeStore(
    encoded,
    encoding,
    new DecompressionStream(compressionFormat),
  );

  // Verify content
  assertEquals(decodedStore.size, 1);
  const quads = decodedStore.match();
  assertEquals(quads.length, 1);
  assertEquals(quads[0].subject.value, "http://example.com/subject");
});

Deno.test("encodeStore and decodeStore without compression", async () => {
  const store = new Store();
  store.add(
    quad(
      namedNode("http://example.com/subject"),
      namedNode("http://example.com/predicate"),
      namedNode("http://example.com/object"),
    ),
  );

  const encoding = "application/n-quads";

  // Encode without compression
  const encoded = await encodeStore(store, encoding);

  // Verify it's a Uint8Array (as per new signature)
  assertEquals(encoded instanceof Uint8Array, true);

  // Decode without decompression
  const decodedStore = await decodeStore(encoded, encoding);

  // Verify content
  // Verify content
  assertEquals(decodedStore.size, 1);
});

Deno.test("encodeStore and decodeStore round trip with all formats and compressions", async () => {
  const store = new Store();
  store.add(
    quad(
      namedNode("http://example.com/subject"),
      namedNode("http://example.com/predicate"),
      namedNode("http://example.com/object"),
    ),
  );

  const compressionFormats: CompressionFormat[] = [
    "deflate",
    "deflate-raw",
    "gzip",
  ];

  const encodings = [
    "application/ld+json",
    "application/n-quads",
    "application/trig",
  ] as const;

  for (const encoding of encodings) {
    // Test without compression
    {
      const encoded = await encodeStore(store, encoding);
      const decoded = await decodeStore(encoded, encoding);
      assertEquals(decoded.size, 1);
      const quads = decoded.match();
      assertEquals(quads.length, 1);
      assertEquals(quads[0].subject.value, "http://example.com/subject");
    }

    // Test with each compression format
    for (const compression of compressionFormats) {
      const encoded = await encodeStore(
        store,
        encoding,
        new CompressionStream(compression),
      );
      const decoded = await decodeStore(
        encoded,
        encoding,
        new DecompressionStream(compression),
      );
      assertEquals(
        decoded.size,
        1,
        `Failed for ${encoding} with ${compression}`,
      );
      const quads = decoded.match();
      assertEquals(quads.length, 1);
      assertEquals(quads[0].subject.value, "http://example.com/subject");
    }
  }
});
