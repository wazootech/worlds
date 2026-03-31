import * as n3 from "n3";
import { Validator as SHACLValidator } from "shacl-engine";
import { z } from "zod";
import { type Ontology, ontologySchema } from "./schema.ts";
import type { CreateToolsOptions } from "./options.ts";

/**
 * Triple is a simplified representation of an RDF triple.
 */
export interface Triple {
  /**
   * subject is the subject IRI of the triple.
   */
  subject: string;

  /**
   * predicate is the predicate IRI of the triple.
   */
  predicate: string;

  /**
   * object is the object IRI or literal value.
   */
  object: string;
}

/**
 * tripleSchema is the schema for a simplified triple.
 */
export const tripleSchema: z.ZodType<Triple> = z.object({
  subject: z.string().describe("The subject IRI."),
  predicate: z.string().describe("The predicate IRI."),
  object: z.string().describe("The object IRI or literal value."),
});

/**
 * ValidateRdfInput is the input to the validateRdf tool.
 */
export interface ValidateRdfInput {
  /**
   * triples is the list of triples to validate.
   */
  triples: Triple[];

  /**
   * ontology is the schema and classes to validate against.
   */
  ontology: Ontology;

  /**
   * source is the optional context source.
   */
  source?: string;
}

/**
 * validateRdfInputSchema is the input schema for the validateRdf tool.
 */
export const validateRdfInputSchema: z.ZodType<ValidateRdfInput> = z
  .object({
    triples: z.array(tripleSchema).describe(
      "A list of triples to validate.",
    ),
    ontology: ontologySchema.describe(
      "The ontology (allowed classes and properties) to validate against. Usually discovered via the schema discovery tool or provided in the prompt.",
    ),
    source: z.string().optional().describe(
      "The ID or slug of the source this validation is for. If provided, the tool can fetch current subject context for deeper validation.",
    ),
  });

/**
 * ValidateRdfOutput is the output of the validateRdf tool.
 */
export interface ValidateRdfOutput {
  /**
   * isValid is true if the RDF conforms to the ontology and SHACL shapes.
   */
  isValid: boolean;

  /**
   * errors contains the list of validation failure messages.
   */
  errors: string[];
}

/**
 * validateRdfOutputSchema is the output schema for the validateRdf tool.
 */
export const validateRdfOutputSchema: z.ZodType<ValidateRdfOutput> = z
  .object({
    isValid: z.boolean().describe(
      "Whether the triples are valid according to the ontology.",
    ),
    errors: z.array(z.string()).describe(
      "A list of validation errors, if any.",
    ),
  });

/**
 * validateRdf validates a set of triples against an ontology and optional SHACL shapes.
 */
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
