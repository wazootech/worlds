import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { ulid } from "@std/ulid";
import type { CreateToolsOptions } from "../options.ts";

/**
 * GenerateIriInput is the input to the generateIri tool.
 */
export interface GenerateIriInput {
  referenceText: string;
}

/**
 * generateIriInputSchema is the input schema for the generateIri tool.
 */
export const generateIriInputSchema: z.ZodType<GenerateIriInput> = z.object(
  {
    referenceText: z.string().describe(
      "The text of the associated entity as mentioned in the given text.",
    ),
  },
);

/**
 * GenerateIriOutput is the output of the generateIri tool.
 */
export interface GenerateIriOutput {
  iri: string;
}

/**
 * generateIriOutputSchema is the output schema for the generateIri tool.
 */
export const generateIriOutputSchema: z.ZodType<GenerateIriOutput> = z.object(
  {
    iri: z.string().describe(
      "The generated IRI for the new entity.",
    ),
  },
);

/**
 * GenerateIriTool is a tool that generates a unique IRI
 * (Internationalized Resource Identifier) for a new entity.
 */
export type GenerateIriTool = Tool<GenerateIriInput, GenerateIriOutput>;

/**
 * createGenerateIriTool creates a tool that generates a unique IRI
 * (Internationalized Resource Identifier) for a new entity.
 */
export function createGenerateIriTool(
  { generateIri = () => `https://wazoo.tech/.well-known/genid/${ulid()}` }:
    CreateToolsOptions,
): GenerateIriTool {
  return tool({
    description:
      "Generate a unique IRI for a new entity when you need to insert a new node into the graph.",
    inputSchema: generateIriInputSchema,
    outputSchema: generateIriOutputSchema,
    execute: async () => {
      return { iri: await generateIri() };
    },
  });
}
