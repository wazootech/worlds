import { tool } from "ai";
import * as n3 from "n3";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  validateRdf,
  validateRdfInputSchema,
  validateRdfOutputSchema,
} from "#/validate.ts";
import type {
  Triple,
  ValidateRdfInput,
  ValidateRdfOutput,
} from "#/validate.ts";

/**
 * ValidateRdfTool is a tool that validates RDF data against an ontology.
 */
export type ValidateRdfTool = Tool<ValidateRdfInput, ValidateRdfOutput>;

/**
 * createValidateRdfTool creates a tool that validates RDF data against an ontology.
 */
export function createValidateRdfTool(
  options: CreateToolsOptions,
): ValidateRdfTool {
  const { worlds, sources } = options;

  return tool({
    description:
      "Validate a set of RDF data against an allowed ontology and SHACL shapes before inserting them. " +
      "This ensures structural consistency and prevents 'inventing' new predicates.",
    inputSchema: validateRdfInputSchema,
    outputSchema: validateRdfOutputSchema,
    execute: async (input: ValidateRdfInput) => {
      const { source, triples: _triples } = input;
      let contextRdf: Triple[] = [];

      const s = sources.find((s) =>
        (typeof s === "string" ? s : s.world) === source
      );
      const hasSchemaSupport = typeof s === "object" ? s.schema : false;

      if (source && worlds && hasSchemaSupport) {
        try {
          const buffer = await worlds.export(source, {
            format: "n-triples",
          });
          const text = new TextDecoder().decode(buffer);
          const parser = new n3.Parser({ format: "N-Triples" });
          const quads = parser.parse(text);
          // deno-lint-ignore no-explicit-any
          contextRdf = quads.map((q: any) => ({
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
