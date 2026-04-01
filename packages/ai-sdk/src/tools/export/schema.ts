import { z } from "zod";

/** WorldsExportInput is the input for exporting RDF data from a world. */
export interface WorldsExportInput {
  world: string;
}

/** worldsExportInputSchema is the Zod schema for world export input. */
export const worldsExportInputSchema: z.ZodType<WorldsExportInput> = z.object({
  world: z.string().describe("The world ID to export"),
});

/** WorldsExportOutput is the output for exporting RDF data from a world. */
export interface WorldsExportOutput {
  data: string;
}

/** worldsExportOutputSchema is the Zod schema for world export output. */
export const worldsExportOutputSchema: z.ZodType<WorldsExportOutput> = z.object(
  {
    data: z.string(),
  },
);
