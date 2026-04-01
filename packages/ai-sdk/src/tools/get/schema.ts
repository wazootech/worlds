import { z } from "zod";
import { worldSchema } from "@wazoo/worlds-sdk";

/** WorldsGetInput is the input for retrieving world metadata. */
export interface WorldsGetInput {
  world: string;
}

/** worldsGetInputSchema is the Zod schema for world retrieval input. */
export const worldsGetInputSchema: z.ZodType<WorldsGetInput> = z.object({
  world: z.string().describe("The world ID to retrieve"),
});

/** worldsGetOutputSchema is the Zod schema for world retrieval output. */
export const worldsGetOutputSchema: z.ZodType<z.infer<typeof worldSchema>> =
  worldSchema;
