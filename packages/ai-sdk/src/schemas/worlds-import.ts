import { z } from "zod";

export interface WorldsImportInput {
  world: string;
  data: string;
}

export const worldsImportSchema: z.ZodType<WorldsImportInput> = z.object({
  world: z.string().describe("The world ID to import data into"),
  data: z.string().describe("RDF data in N-Triples or N-Quads format"),
});

export const worldsImportToolDefinition = {
  name: "worlds_import",
  description: "Import RDF data into a world",
  inputSchema: worldsImportSchema,
} as const;
