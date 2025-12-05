import type { Store } from "oxigraph";
import type { OxigraphService } from "./oxigraph-service.ts";
import type { DecodableEncoding } from "./oxigraph-encoding.ts";
import {
  decodableEncodings,
  decodeStore,
  encodeStore,
} from "./oxigraph-encoding.ts";

export class DenoKvOxigraphService implements OxigraphService {
  public constructor(
    private readonly kv: Deno.Kv,
    private readonly prefix: Deno.KvKey = ["stores"],
    private readonly encoding: DecodableEncoding = decodableEncodings.nq,
    private readonly compressionFormat: CompressionFormat = "gzip",
  ) {}

  public async getStore(id: string): Promise<Store | null> {
    const result = await this.kv.get<Uint8Array>([...this.prefix, id]);
    if (result.value === null) {
      return null;
    }

    return await decodeStore(
      result.value,
      this.encoding,
      new DecompressionStream(this.compressionFormat),
    );
  }

  public async setStore(id: string, store: Store): Promise<void> {
    const encoded = await encodeStore(
      store,
      this.encoding,
      new CompressionStream(this.compressionFormat),
    );
    await this.kv.set([...this.prefix, id], encoded);
  }

  public async removeStore(id: string): Promise<void> {
    await this.kv.delete([...this.prefix, id]);
  }
}
