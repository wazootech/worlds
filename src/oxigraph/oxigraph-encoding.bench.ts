import { namedNode, quad, Store } from "oxigraph";
import {
  decodableEncodings,
  decodeStore,
  encodeStore,
} from "./oxigraph-encoding.ts";

const compressionFormats: CompressionFormat[] = [
  "deflate",
  "deflate-raw",
  "gzip",
];

const decodedStore = new Store();
decodedStore.add(
  quad(
    namedNode("http://example.com/subject"),
    namedNode("http://example.com/predicate"),
    namedNode("http://example.com/object"),
  ),
);

for (const [name, encoding] of Object.entries(decodableEncodings)) {
  const encodedStore = await encodeStore(decodedStore, encoding);
  Deno.bench({
    name: `decodeStore ${name}`,
    fn: async () => {
      await decodeStore(encodedStore, encoding);
    },
  });

  for (const compressionFormat of compressionFormats) {
    const compressedStore = await encodeStore(
      decodedStore,
      encoding,
      new CompressionStream(compressionFormat),
    );
    Deno.bench({
      name: `decodeStore ${name} with ${compressionFormat}`,
      fn: async () => {
        await decodeStore(
          compressedStore,
          encoding,
          new DecompressionStream(compressionFormat),
        );
      },
    });
  }

  Deno.bench({
    name: `encodeStore ${name}`,
    fn: async () => {
      await encodeStore(decodedStore, encoding);
    },
  });

  for (const compressionFormat of compressionFormats) {
    Deno.bench({
      name: `encodeStore ${name} with ${compressionFormat}`,
      fn: async () => {
        await encodeStore(
          decodedStore,
          encoding,
          new CompressionStream(compressionFormat),
        );
      },
    });
  }
}
