import { z } from "zod";
import type { ExecuteSparqlOutput } from "@wazoo/worlds-sdk";
import { executeSparqlOutputSchema } from "@wazoo/worlds-sdk";

/** ExecuteSparqlInput is the input for executing a SPARQL query. */
export interface ExecuteSparqlInput {
  world: string;
  query: string;
}

/** executeSparqlInputSchema is the Zod schema for SPARQL execution input. */
export const executeSparqlInputSchema: z.ZodType<ExecuteSparqlInput> = z.object(
  {
    world: z.string().describe("The world ID to query"),
    query: z.string().describe("SPARQL query string"),
  },
);

export { executeSparqlOutputSchema };
export type { ExecuteSparqlOutput };
