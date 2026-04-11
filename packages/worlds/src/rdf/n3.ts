import { Parser, Store, Writer } from "n3";

/**
 * generateN3StoreFromBlob gets a world as an N3 Store.
 * @param blob The world data as a blob.
 * @returns The N3 Store.
 */
export async function generateN3StoreFromBlob(
  blob: Blob,
): Promise<Store> {
  const worldString = await blob.text();
  const parser = new Parser({ format: "N-Quads" });
  const quads = parser.parse(worldString);
  const store = new Store();
  store.addQuads(quads);
  return store;
}

/**
 * generateBlobFromN3Store sets a world as an N3 Store.
 * @param store The N3 Store.
 * @returns The world data as a blob.
 */
export async function generateBlobFromN3Store(
  store: Store,
): Promise<Blob> {
  const writer = new Writer({ format: "N-Quads" });
  writer.addQuads(store.getQuads(null, null, null, null));
  const nQuadsString = await new Promise<string>((resolve, reject) => {
    writer.end((error: Error | null, result: string | undefined) => {
      if (error) reject(error);
      else resolve(result as string);
    });
  });
  return new Blob(
    [nQuadsString],
    { type: "application/n-quads" },
  );
}


