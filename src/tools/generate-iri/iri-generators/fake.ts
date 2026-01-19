import type { IriGenerator } from "#/tools/generate-iri/tool.ts";

export function createFakeIriGenerator(fakeIri: string): IriGenerator {
  return (_input) => fakeIri;
}
