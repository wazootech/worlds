import { tool } from "ai";
import * as n3 from "n3";
import { Validator as SHACLValidator } from "shacl-engine";
import type { Tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  validateRdfInputSchema,
  validateRdfOutputSchema,
} from "#/tools/validate-rdf/schema.ts";
import type {
  Triple,
  ValidateRdfInput,
  ValidateRdfOutput,
} from "#/tools/validate-rdf/schema.ts";

/** validateRdf validates a set of triples against an ontology and optional SHACL shapes. */
export async function validateRdf(
  { triples, ontology }: ValidateRdfInput,
  options: Partial<CreateToolsOptions> = {},
  contextRdf: Triple[] = [],
): Promise<ValidateRdfOutput> {
  const errors: string[] = [];
  const allowedProperties = new Set(ontology.properties);

  // Basic Ontology Validation
  const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  const allowedClasses = new Set(ontology.classes);

  for (const triple of triples) {
    if (
      !allowedProperties.has(triple.predicate) &&
      triple.predicate !== RDF_TYPE
    ) {
      errors.push(
        `Predicate '${triple.predicate}' is not allowed by the ontology.`,
      );
    }

    if (
      triple.predicate === RDF_TYPE && !allowedClasses.has(triple.object)
    ) {
      errors.push(
        `Class '${triple.object}' is not allowed by the ontology.`,
      );
    }
  }

  // SHACL Validation (if shapes provided)
  const shacl = ontology.shacl ?? options.shacl;
  if (shacl) {
    try {
      const shapesStore = new n3.Store();
      const parser = new n3.Parser({ format: "text/turtle" });

      // Load shapes
      await new Promise<void>((resolve, reject) => {
        parser.parse(shacl, (error, quad) => {
          if (error) reject(error);
          else if (quad) shapesStore.addQuad(quad);
          else resolve();
        });
      });

      const dataStore = new n3.Store();
      const allRdf = [...contextRdf, ...triples];
      for (const t of allRdf) {
        dataStore.addQuad(
          n3.DataFactory.namedNode(t.subject),
          n3.DataFactory.namedNode(t.predicate),
          t.object.startsWith("http") || t.object.startsWith("_:")
            ? n3.DataFactory.namedNode(t.object)
            : n3.DataFactory.literal(t.object),
        );
      }

      const validator = new SHACLValidator(shapesStore, {
        factory: n3.DataFactory,
      });
      const report = await validator.validate({ dataset: dataStore });

      if (!report.conforms) {
        for (const res of report.results) {
          const focusNode = res.focusNode?.value ?? "unknown node";
          const path = res.resultPath?.value ?? "unknown path";
          const component =
            res.sourceConstraintComponent?.value?.split("#").pop() ??
              "ConstraintViolation";

          let message =
            `Constraint violation at ${focusNode} for path ${path} (${component})`;

          // Try to get message safely, but fall back to generated one if it throws
          try {
            if (res.message && res.message.length > 0 && res.message[0]) {
              const m = (res.message[0] as unknown as { value: string }).value;
              if (m) message = m;
            }
          } catch (_e) {
            // Use fallback message
          }

          errors.push(`SHACL Error: ${message}`);
        }
      }
    } catch (e) {
      errors.push(
        `SHACL Parsing Error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/** ValidateRdfTool is a tool that validates RDF data against an ontology. */
export type ValidateRdfTool = Tool<ValidateRdfInput, ValidateRdfOutput>;

/** validateRdfTool defines the metadata for the RDF validation tool. */
export const validateRdfTool = {
  name: "validate_rdf",
  description:
    "Checks a set of RDF triples against an allowed ontology (classes and properties) and SHACL shapes. Use this tool before inserting any new data to prevent schema violations or 'invented' predicates. Input must be 'triples' to check and an 'ontology' definition. Returns a validation report with errors if any.",
  inputSchema: validateRdfInputSchema,
  outputSchema: validateRdfOutputSchema,
};

/** createValidateRdfTool instantiates the RDF validation tool. */
export function createValidateRdfTool(
  options: CreateToolsOptions,
): ValidateRdfTool {
  const { worlds, sources } = options;

  return tool({
    ...validateRdfTool,
    execute: async (input: ValidateRdfInput) => {
      const { source } = input;
      let contextRdf: Triple[] = [];

      const s = sources.find((s) =>
        (typeof s === "string" ? s : s.world) === source
      );
      const hasSchemaSupport = typeof s === "object" ? s.schema : false;

      if (source && worlds && hasSchemaSupport) {
        try {
          const buffer = await worlds.export(source, {
            contentType: "application/n-triples",
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
