import type { OxigraphService } from "#/oxigraph/oxigraph-service.ts";
import type { ApiKeysService } from "#/api-keys/api-keys-service.ts";
import { DenoKvOxigraphService } from "#/oxigraph/deno-kv-oxigraph-service.ts";
import { DenoKvApiKeysService } from "#/api-keys/deno-kv-api-keys-service.ts";

export interface AppContext {
  oxigraphService: OxigraphService;
  apiKeysService: ApiKeysService;
}

export function kvAppContext(kv: Deno.Kv): AppContext {
  return {
    oxigraphService: new DenoKvOxigraphService(kv),
    apiKeysService: new DenoKvApiKeysService(kv),
  };
}
