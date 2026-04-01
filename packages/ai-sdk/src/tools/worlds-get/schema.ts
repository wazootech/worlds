import { z } from "zod";
import { worldSchema } from "@wazoo/worlds-sdk";

export interface WorldsGetInput {
  world: string;
}

export const worldsGetInputSchema: z.ZodType<WorldsGetInput> = z.object({
  world: z.string().describe("The world ID to retrieve"),
});

export const worldsGetOutputSchema: z.ZodType<z.infer<typeof worldSchema>> =
  worldSchema;
