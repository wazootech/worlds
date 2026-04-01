import { z } from "zod";

/** GenerateIriInput is the input to the IRI generation tool. */
export interface GenerateIriInput {
  referenceText: string;
}

/** generateIriInputSchema is the Zod schema for IRI generation input. */
export const generateIriInputSchema: z.ZodType<GenerateIriInput> = z.object(
  {
    referenceText: z.string().describe(
      "The text of the associated entity as mentioned in the given text.",
    ),
  },
);

/** GenerateIriOutput is the output of the IRI generation tool. */
export interface GenerateIriOutput {
  iri: string;
}

/** generateIriOutputSchema is the Zod schema for IRI generation output. */
export const generateIriOutputSchema: z.ZodType<GenerateIriOutput> = z.object(
  {
    iri: z.string().describe(
      "The generated IRI for the new entity.",
    ),
  },
);
