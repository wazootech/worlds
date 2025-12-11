import type { Quad, Store, Term } from "oxigraph";

/**
 * OxigraphService is the service for Oxigraph stores.
 */
export interface OxigraphService {
  listStores(): Promise<string[]>;
  getStore(id: string): Promise<Store | null>;
  getMetadata(id: string): Promise<StoreMetadata | null>;
  setStore(id: string, owner: string, store: Store): Promise<void>;
  addQuads(id: string, owner: string, quads: Quad[]): Promise<void>;
  query(
    id: string,
    query: string,
  ): Promise<boolean | Map<string, Term>[] | Quad[] | string>;
  update(id: string, query: string): Promise<void>;
  removeStore(id: string): Promise<void>;
}

/**
 * StoreMetadata contains metadata about a store.
 */
export interface StoreMetadata {
  /**
   * id is the store ID.
   */
  id: string;

  /**
   * size is the size of the store in bytes.
   */
  size: number;

  /**
   * tripleCount is the number of triples in the store.
   */
  tripleCount: number;

  /**
   * createdAt is the time the store was created.
   */
  createdAt: number;

  /**
   * createdBy is the account ID of the user who created the store.
   */
  createdBy: string;

  /**
   * updatedAt is the time the store was last updated.
   */
  updatedAt: number;
}
