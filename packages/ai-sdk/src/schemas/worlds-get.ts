import { z } from "zod";

export interface WorldsGetInput {
  world: string;
}

export const worldsGetSchema: z.ZodType<WorldsGetInput> = z.object({
  world: z.string().describe("The world ID to retrieve"),
});

export const worldsGetToolDefinition = {
  name: "worlds_get",
  description: "Get a world by ID",
  inputSchema: worldsGetSchema,
} as const;
