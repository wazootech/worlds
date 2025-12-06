import { Quad, Store } from "oxigraph";

/**
 * OxigraphService is the service for Oxigraph stores.
 */
export interface OxigraphService {
  getStore(id: string): Promise<Store | null>;
  setStore(id: string, store: Store): Promise<void>;
  addQuads(id: string, quads: Quad[]): Promise<void>;
  query(id: string, query: string): Promise<unknown>;
  update(id: string, query: string): Promise<void>;
  removeStore(id: string): Promise<void>;
}
