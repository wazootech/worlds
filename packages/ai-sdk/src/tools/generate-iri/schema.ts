import { z } from "zod";

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
