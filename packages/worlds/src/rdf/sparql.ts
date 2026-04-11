import type { Store } from "n3";
import type { PatchHandler } from "./patch/mod.ts";
import { connectSearchStoreToN3Store } from "./patch/mod.ts";
import type {
  WorldsSparqlOutput,
} from "#/schemas/mod.ts";

export interface DatasetParams {
  defaultGraphUris: string[];
  namedGraphUris: string[];
}

export class NoopPatchHandler implements PatchHandler {
  patch(): Promise<void> {
    return Promise.resolve();
  }
}

// deno-lint-ignore no-explicit-any
const queryEngine: any = null;

export async function sparql(
  store: Store,
  _query: string,
  handler: PatchHandler = new NoopPatchHandler(),
): Promise<{ store: Store; result: WorldsSparqlOutput }> {
  const { sync } = connectSearchStoreToN3Store(
    handler,
    store,
  );
  await sync();
  throw new Error("SPARQL Disabled for diagnostics");
}

export async function sparqlBlob(
  blob: Blob,
  _query: string,
  _handler: PatchHandler = new NoopPatchHandler(),
): Promise<{ blob: Blob; result: WorldsSparqlOutput }> {
  return { blob, result: null };
}
