import { z } from "zod";
import { ontologySchema } from "../../schema.ts";
import type { Ontology } from "../../schema.ts";

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
