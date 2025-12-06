import { Store } from "oxigraph";

/**
 * DecodableEncoding is the type of encoding format that can be decoded.
 */
export type DecodableEncoding =
  typeof decodableEncodings[keyof typeof decodableEncodings];

/**
 * decodableEncodings is the set of encoding format that can be decoded.
 */
export const decodableEncodings = {
  jsonld: "application/ld+json",
  nq: "application/n-quads",
  trig: "application/trig",
} as const;

/**
 * EncodableEncoding is the type of encoding format that can be encoded.
 */
export type EncodableEncoding =
  typeof encodableEncodings[keyof typeof encodableEncodings];

/**
 * encodableEncodings is the set of encoding format that can be encoded.
 */
export const encodableEncodings = {
  ...decodableEncodings,
  ttl: "text/turtle",
  nt: "application/n-triples",
  n3: "text/n3",
  rdf: "application/rdf+xml",
} as const;

/**
 * encodeStore encodes a store into a byte stream.
 */
export function encodeStore(
  store: Store,
  encoding: EncodableEncoding,
  compression?: CompressionStream,
): ReadableStream<Uint8Array> {
  // Oxigraph dump is synchronous, so we start the stream with the string data.
  const stringData = store.dump({ format: encoding });

  const stream = ReadableStream.from([stringData])
    .pipeThrough(new TextEncoderStream());
  if (compression) {
    return stream.pipeThrough(
      compression as ReadableWritablePair<Uint8Array, Uint8Array>,
    );
  }

  return stream;
}

/**
 * decodeStore decodes a byte stream into a Store.
 */
export async function decodeStore(
  stream: ReadableStream<Uint8Array>,
  encoding: DecodableEncoding,
  decompression?: DecompressionStream,
): Promise<Store> {
  let textStream: ReadableStream<string>;

  if (decompression) {
    textStream = stream
      .pipeThrough(
        decompression as ReadableWritablePair<
          Uint8Array,
          Uint8Array
        >,
      )
      .pipeThrough(new TextDecoderStream());
  } else {
    textStream = stream.pipeThrough(new TextDecoderStream());
  }

  // We accumulate the stream into a string because Oxigraph.load() is synchronous.
  const reader = textStream.getReader();
  const chunks: string[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const store = new Store();
  store.load(chunks.join(""), { format: encoding });
  return store;
}
