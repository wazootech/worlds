import { z } from "zod";

export interface WorldsImportInput {
  world: string;
  data: string;
}

export const worldsImportInputSchema: z.ZodType<WorldsImportInput> = z.object({
  world: z.string().describe("The world ID to import data into"),
  data: z.string().describe("RDF data in N-Triples or N-Quads format"),
});

export interface WorldsImportOutput {
  success: boolean;
}

export const worldsImportOutputSchema: z.ZodType<WorldsImportOutput> = z.object(
  {
    success: z.boolean(),
  },
);
