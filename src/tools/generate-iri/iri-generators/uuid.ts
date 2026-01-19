import type { IriGenerator } from "#/tools/generate-iri/tool.ts";

export function createUuidIriGenerator(): IriGenerator {
  return (_input) => crypto.randomUUID();
}
