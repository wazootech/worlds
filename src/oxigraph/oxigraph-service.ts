import { Store } from "oxigraph";

/**
 * OxigraphService is the service for Oxigraph stores.
 */
export interface OxigraphService {
  getStore(id: string): Promise<Store | null>;
  setStore(id: string, store: Store): Promise<void>;
  removeStore(id: string): Promise<void>;
}
