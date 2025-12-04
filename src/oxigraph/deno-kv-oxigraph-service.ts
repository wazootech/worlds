import type { Store } from "oxigraph";
import type { OxigraphService, StoreEncoding } from "./oxigraph-service.ts";
import { decodeStore, encodeStore, encodings } from "./oxigraph-service.ts";

export class DenoKvOxigraphService implements OxigraphService {
  public constructor(
    private readonly kv: Deno.Kv,
    private readonly prefix: Deno.KvKey = ["stores"],
    private readonly encoding: StoreEncoding = encodings.nq,
  ) {}

  public async getStore(id: string): Promise<Store | null> {
    const result = await this.kv.get<string>([...this.prefix, id]);
    if (result.value === null) {
      return null;
    }

    return decodeStore(result.value, this.encoding);
  }

  public async setStore(id: string, store: Store): Promise<void> {
    await this.kv.set([...this.prefix, id], encodeStore(store, this.encoding));
  }

  public async removeStore(id: string): Promise<void> {
    await this.kv.delete([...this.prefix, id]);
  }
}
