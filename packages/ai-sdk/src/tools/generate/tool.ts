import { tool } from "ai";
import { ulid } from "@std/ulid/ulid";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  generateIriInputSchema,
  generateIriOutputSchema,
} from "#/tools/generate/schema.ts";
import type {
  GenerateIriInput,
  GenerateIriOutput,
} from "#/tools/generate/schema.ts";

/** GenerateIriTool is a tool that generates a unique IRI for a new entity. */
export type GenerateIriTool = Tool<GenerateIriInput, GenerateIriOutput>;

/** generateIriTool defines the metadata for the IRI generation tool. */
export const generateIriTool = {
  name: "generate_iri",
  description:
    "Generates a globally unique IRI (Internationalized Resource Identifier) for a new entity. Use this tool ONLY after searching and confirming that no existing IRI matches the entity you want to create. Input is 'referenceText' for context. Returns a unique IRI string.",
  inputSchema: generateIriInputSchema,
  outputSchema: generateIriOutputSchema,
};

/** createGenerateIriTool instantiates the IRI generation tool. */
export function createGenerateIriTool(
  { generateIri = () => `https://wazoo.dev/.well-known/genid/${ulid()}` }:
    Partial<CreateToolsOptions> = {},
): GenerateIriTool {
  return tool({
    ...generateIriTool,
    execute: async () => {
      return { iri: await generateIri() };
    },
  });
}
