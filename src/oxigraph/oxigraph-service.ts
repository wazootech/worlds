import { Store } from "oxigraph";

/**
 * OxigraphService is the service for Oxigraph stores.
 */
export interface OxigraphService {
  getStore(id: string): Promise<Store | null>;
  setStore(id: string, store: Store): Promise<void>;
  removeStore(id: string): Promise<void>;
}

// Future work: Compression with Uint8Array.

export type StoreEncoding = typeof encodings[keyof typeof encodings];

export const encodings = {
  jsonld: "application/ld+json",
  nq: "application/n-quads",
  trig: "application/trig",
  //
  // Error: A RDF format supporting datasets was expected
  // ttl: "text/turtle",
  // nt: "application/n-triples",
  // n3: "text/n3",
  // rdf: "application/rdf+xml",
} as const;

export function encodeStore(store: Store, encoding: StoreEncoding): string {
  return store.dump({ format: encoding });
}

export function decodeStore(data: string, encoding: StoreEncoding): Store {
  const store = new Store();
  store.load(data, { format: encoding });
  return store;
}
