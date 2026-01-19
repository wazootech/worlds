import { ulid } from "@std/ulid";
import type { IriGenerator } from "#/tools/generate-iri/tool.ts";

export function createUlidIriGenerator(): IriGenerator {
  return (_input) => ulid();
}
