import { z } from "zod";

export interface WorldsExportInput {
  world: string;
}

export const worldsExportInputSchema: z.ZodType<WorldsExportInput> = z.object({
  world: z.string().describe("The world ID to export"),
});

export interface WorldsExportOutput {
  data: string;
}

export const worldsExportOutputSchema: z.ZodType<WorldsExportOutput> = z.object(
  {
    data: z.string(),
  },
);
