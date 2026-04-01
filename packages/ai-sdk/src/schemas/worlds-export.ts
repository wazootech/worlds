import { z } from "zod";

export interface WorldsExportInput {
  world: string;
}

export const worldsExportSchema: z.ZodType<WorldsExportInput> = z.object({
  world: z.string().describe("The world ID to export"),
});

export const worldsExportToolDefinition = {
  name: "worlds_export",
  description: "Export a world as RDF data",
  inputSchema: worldsExportSchema,
} as const;
