import { namedNode, quad, Store } from "oxigraph";
import { decodeStore, encodeStore, encodings } from "./oxigraph-service.ts";

const decodedStore = new Store();
decodedStore.add(
  quad(
    namedNode("http://example.com/subject"),
    namedNode("http://example.com/predicate"),
    namedNode("http://example.com/object"),
  ),
);

for (const [name, encoding] of Object.entries(encodings)) {
  const encodedStore = encodeStore(decodedStore, encoding);
  Deno.bench({
    name: `decodeStore ${name}`,
    fn: () => {
      decodeStore(encodedStore, encoding);
    },
  });

  Deno.bench({
    name: `encodeStore ${name}`,
    fn: () => {
      encodeStore(decodedStore, encoding);
    },
  });
}
