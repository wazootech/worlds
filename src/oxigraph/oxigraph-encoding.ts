import { toArrayBuffer, toText } from "@std/streams";
import { Store } from "oxigraph";

/**
 * DecodableEncoding is the type of encoding formats that can be decoded.
 */
export type DecodableEncoding =
  typeof decodableEncodings[keyof typeof decodableEncodings];

/**
 * decodableEncodings is the set of encoding formats that can be decoded.
 */
export const decodableEncodings = {
  jsonld: "application/ld+json",
  nq: "application/n-quads",
  trig: "application/trig",
} as const;

/**
 * EncodableEncoding is the type of encoding formats that can be encoded.
 */
export type EncodableEncoding =
  typeof encodableEncodings[keyof typeof encodableEncodings];

/**
 * encodableEncodings is the set of encoding formats that can be encoded.
 */
export const encodableEncodings = {
  ...decodableEncodings,
  ttl: "text/turtle",
  nt: "application/n-triples",
  n3: "text/n3",
  rdf: "application/rdf+xml",
} as const;

/**
 * encodeStore encodes a store into a Uint8Array, optionally compressed.
 *
 * Recommended compression format: gzip
 */
export async function encodeStore(
  store: Store,
  encoding: EncodableEncoding,
  compression?: CompressionStream,
): Promise<Uint8Array> {
  const stringData = store.dump({ format: encoding });
  const encodedData = new TextEncoder().encode(stringData);
  if (compression) {
    const stream = ReadableStream.from([encodedData]).pipeThrough(compression);
    const compressedData = new Uint8Array(await toArrayBuffer(stream));
    return compressedData;
  }

  return encodedData;
}

/**
 * decodeStore decodes a Uint8Array (or string) into a store, optionally decompressed.
 *
 * Recommended decompression format: gzip
 */
export async function decodeStore(
  data: Uint8Array,
  encoding: DecodableEncoding,
  decompression?: DecompressionStream,
): Promise<Store> {
  let encodedData: string;
  if (decompression) {
    const stream = ReadableStream.from([data])
      .pipeThrough(decompression as ReadableWritablePair);
    encodedData = await toText(stream);
  } else {
    encodedData = new TextDecoder().decode(data);
  }

  const store = new Store();
  store.load(encodedData, { format: encoding });
  return store;
}
