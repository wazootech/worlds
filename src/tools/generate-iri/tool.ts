import { tool } from "ai";
import { z } from "zod";

/**
 * createGenerateIriTool creates a tool that generates a unique IRI
 * (Internationalized Resource Identifier) for a new entity.
 */
export function createGenerateIriTool(generateIri: IriGenerator) {
  return tool({
    description:
      "Generate a unique IRI for a new entity. Use this when you need to insert a new node into the graph.",
    inputSchema: generateIriInputSchema,
    execute: async (args) => {
      return { iri: await generateIri(args) };
    },
  });
}

/**
 * IriGenerator is a function that generates an IRI.
 */
export type IriGenerator = (
  input: GenerateIriInput,
) => string | Promise<string>;

/**
 * generateIriInput is the type of the generate IRI tool input.
 */
export type GenerateIriInput = z.infer<typeof generateIriInputSchema>;

/**
 * generateIriInputSchema is the schema for the generate IRI tool input.
 */
export const generateIriInputSchema = z.object({
  entityName: z.string().optional().describe(
    "A human-readable name or label for the entity. Helps associate the IRI with the mentioned entity.",
  ),
  entityType: z.enum([
    "Person",
    "Organization",
    "Place",
    "Event",
    "Concept",
    "Other",
  ]).optional().describe(
    "The type of entity being created. Helps document intent.",
  ),
});
