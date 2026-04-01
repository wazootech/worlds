import { z } from "zod";

export interface WorldsListInput {
  page?: number;
  pageSize?: number;
}

export const worldsListSchema: z.ZodType<WorldsListInput> = z.object({
  page: z.number().default(1).describe("Page number"),
  pageSize: z.number().default(20).describe("Page size"),
});

export const worldsListToolDefinition = {
  name: "worlds_list",
  description: "List all available worlds",
  inputSchema: worldsListSchema,
} as const;
