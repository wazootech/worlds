import { z } from "zod";
import { executeSparqlOutputSchema } from "@wazoo/worlds-sdk";
import type { ExecuteSparqlOutput } from "@wazoo/worlds-sdk";

export interface ExecuteSparqlInput {
  world: string;
  query: string;
}

export const executeSparqlInputSchema: z.ZodType<ExecuteSparqlInput> = z.object(
  {
    world: z.string().describe("The world ID to query"),
    query: z.string().describe("SPARQL query string"),
  },
);

export { executeSparqlOutputSchema };
export type { ExecuteSparqlOutput };
