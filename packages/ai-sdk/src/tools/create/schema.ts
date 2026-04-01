import type { z } from "zod";
import type { CreateWorldParams, World } from "@wazoo/worlds-sdk";
import { createWorldParamsSchema, worldSchema } from "@wazoo/worlds-sdk";

/** WorldsCreateInput is the input for creating a world. */
export interface WorldsCreateInput extends CreateWorldParams {}

/** worldsCreateInputSchema is the Zod schema for world creation input. */
export const worldsCreateInputSchema: z.ZodType<WorldsCreateInput> =
  createWorldParamsSchema;

/** worldsCreateOutputSchema is the Zod schema for world creation output. */
export const worldsCreateOutputSchema: z.ZodType<World> = worldSchema;
