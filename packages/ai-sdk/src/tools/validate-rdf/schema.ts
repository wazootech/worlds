import { z } from "zod";
import { ontologySchema } from "#/schema.ts";
import type { Ontology } from "#/schema.ts";

/** Triple is a simplified representation of an RDF triple. */
export interface Triple {
  subject: string;
  predicate: string;
  object: string;
}

/** tripleSchema is the Zod schema for a simplified triple. */
export const tripleSchema: z.ZodType<Triple> = z.object({
  subject: z.string().describe("The subject IRI."),
  predicate: z.string().describe("The predicate IRI."),
  object: z.string().describe("The object IRI or literal value."),
});

/** ValidateRdfInput is the input for the RDF validation tool. */
export interface ValidateRdfInput {
  triples: Triple[];
  ontology: Ontology;
  source?: string;
}

/** validateRdfInputSchema is the Zod schema for RDF validation input. */
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

/** ValidateRdfOutput is the output of the RDF validation tool. */
export interface ValidateRdfOutput {
  isValid: boolean;
  errors: string[];
}

/** validateRdfOutputSchema is the Zod schema for RDF validation output. */
export const validateRdfOutputSchema: z.ZodType<ValidateRdfOutput> = z
  .object({
    isValid: z.boolean().describe(
      "Whether the triples are valid according to the ontology.",
    ),
    errors: z.array(z.string()).describe(
      "A list of validation errors, if any.",
    ),
  });
