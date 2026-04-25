// deno-lint-ignore-file no-explicit-any
import type { EmbeddedWorlds, WorldsInterface } from "#/engine/service.ts";
import { createTestWorlds } from "./registry.ts";

export type { WorldsInterface };

export async function createTestContext(): Promise<
  { worlds: EmbeddedWorlds; storage: any }
> {
  return await createTestWorlds();
}
