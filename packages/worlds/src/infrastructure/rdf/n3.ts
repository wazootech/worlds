import { Parser, Store, Writer } from "n3";

/**
 * generateN3StoreFromBlob gets a world as an N3 Store.
 * @param blob The world data as a blob.
 * @param format The RDF serialization format.
 * @returns The N3 Store.
 */
export async function generateN3StoreFromBlob(
  blob: Blob,
  format = "application/n-quads",
): Promise<Store> {
  const worldString = await blob.text();
  const parser = new Parser({ format });
  const quads = parser.parse(worldString);
  const store = new Store();
  store.addQuads(quads);
  return store;
}

/**
 * generateBlobFromN3Store sets a world as an N3 Store.
 * @param store The N3 Store.
 * @param format The RDF serialization format.
 * @returns The world data as a blob.
 */
export async function generateBlobFromN3Store(
  store: Store,
  format = "application/n-quads",
): Promise<Blob> {
  const writer = new Writer({ format });
  const quads = store.getQuads(null, null, null, null);
  // @ts-ignore - n3 writer types
  writer.addQuads(quads);
  const nQuadsString = await new Promise<string>((resolve, reject) => {
    writer.end((error: Error | null, result: string | undefined) => {
      if (error) reject(error);
      else resolve(result as string);
    });
  });
  return new Blob(
    [nQuadsString],
    { type: format },
  );
}
