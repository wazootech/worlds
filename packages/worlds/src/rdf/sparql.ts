import type { Store } from "n3";
import type { PatchHandler } from "./patch/mod.ts";
import { connectSearchStoreToN3Store } from "./patch/mod.ts";
import { generateBlobFromN3Store, generateN3StoreFromBlob } from "./n3.ts";
import { executeSparql } from "./sparql-engine.ts";
import type { WorldsSparqlOutput } from "#/worlds/sparql.schema.ts";

const WORLDS_BASE = "https://wazoo.dev/worlds/";

export interface DatasetParams {
  defaultGraphUris: string[];
  namedGraphUris: string[];
}

export class NoopPatchHandler implements PatchHandler {
  patch(): Promise<void> {
    return Promise.resolve();
  }
}

export async function sparql(
  stores: Store[],
  query: string,
  handler: PatchHandler = new NoopPatchHandler(),
): Promise<{ stores: Store[]; result: WorldsSparqlOutput }> {
  if (stores.length > 1) {
    const result = await executeSparql(stores[0], query, WORLDS_BASE);
    return { stores, result };
  }

  const store = stores[0];
  const { store: proxiedStore, sync } = connectSearchStoreToN3Store(
    handler,
    store,
  );

  const result = await executeSparql(proxiedStore, query, WORLDS_BASE);
  await sync();

  return { stores, result };
}

export async function sparqlBlob(
  blob: Blob,
  query: string,
  handler: PatchHandler = new NoopPatchHandler(),
): Promise<{ blob: Blob; result: WorldsSparqlOutput }> {
  const store = await generateN3StoreFromBlob(blob);
  const { store: proxiedStore, sync } = connectSearchStoreToN3Store(
    handler,
    store,
  );

  const result = await executeSparql(proxiedStore, query, WORLDS_BASE);
  await sync();

  const newBlob = await generateBlobFromN3Store(store);
  return { blob: newBlob, result };
}
