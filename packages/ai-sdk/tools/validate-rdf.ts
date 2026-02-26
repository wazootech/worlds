import type { Tool } from "ai";
import { tool } from "ai";
import * as n3 from "n3";
import type { CreateToolsOptions } from "#/options.ts";
import {
  type Triple,
  validateRdf,
  type ValidateRdfInput,
  validateRdfInputSchema,
  validateRdfOutputSchema,
  type ValidateRdfOutput,
} from "#/validate.ts";

/**
 * ValidateRdfTool is a tool that validates RDF data against an ontology.
 */
export type ValidateRdfTool = Tool<ValidateRdfInput, ValidateRdfOutput>;

/**
 * createValidateRdfTool creates a tool that validates RDF data against an ontology.
 */
export function createValidateRdfTool(
  options: Partial<CreateToolsOptions> = {},
): ValidateRdfTool {
  return tool({
    description:
      "Validate a set of RDF data against an allowed ontology and SHACL shapes before inserting them. " +
      "This ensures structural consistency and prevents 'inventing' new predicates.",
    inputSchema: validateRdfInputSchema,
    outputSchema: validateRdfOutputSchema,
    execute: async (input: ValidateRdfInput) => {
      const { worldId } = input;
      let contextRdf: Triple[] = [];

      if (worldId && options.sdk) {
        try {
          const buffer = await options.sdk.worlds.export(worldId, {
            format: "n-triples",
          });
          const text = new TextDecoder().decode(buffer);
          const parser = new n3.Parser({ format: "N-Triples" });
          const quads = parser.parse(text);
          contextRdf = quads.map((q) => ({
            subject: q.subject.value,
            predicate: q.predicate.value,
            object: q.object.value,
          }));
        } catch (error) {
          // If the world doesn't exist or export fails, we proceed with empty context
          // but log the error for visibility during development/debugging.
          console.error(
            "Failed to fetch full world context for validation:",
            error,
          );
        }
      }

      return await validateRdf(input, options, contextRdf);
    },
  });
}
