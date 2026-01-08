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
 * isDecodableEncoding checks if the value is a DecodableEncoding.
 */
export function isDecodableEncoding(
  value: string,
): value is DecodableEncoding {
  return typeof value === "string" &&
    Object.values(decodableEncodings).includes(value as DecodableEncoding);
}

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
 * isEncodableEncoding checks if the value is an EncodableEncoding.
 */
export function isEncodableEncoding(
  value: string,
): value is EncodableEncoding {
  return typeof value === "string" &&
    Object.values(encodableEncodings).includes(value as EncodableEncoding);
}

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

  let totalSize = 0;
  const LIMIT = 10 * 1024 * 1024; // 10MB limit
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalSize += value.length;
        if (totalSize > LIMIT) {
          throw new Error("Payload too large");
        }

        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const fullText = chunks.join("");
  const store = new Store();
  store.load(fullText, { format: encoding });

  return store;
}
