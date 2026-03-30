import type { Tool } from "ai";
import { tool } from "ai";
import type { CreateToolsOptions } from "#/options.ts";
import {
  discoverSchema,
  type DiscoverSchemaInput,
  discoverSchemaInputSchema,
  type DiscoverSchemaOutput,
  discoverSchemaOutputSchema,
} from "../discover-schema.ts";

/**
 * DiscoverSchemaTool is a tool that discovers RDF classes and properties.
 */
export type DiscoverSchemaTool = Tool<
  DiscoverSchemaInput,
  DiscoverSchemaOutput
>;

/**
 * createDiscoverSchemaTool creates a tool that discovers RDF classes and properties.
 */
export function createDiscoverSchemaTool(
  options: CreateToolsOptions,
): DiscoverSchemaTool {
  return tool({
    description:
      "Discover the available classes and properties (vocabulary) in the knowledge base schema.",
    inputSchema: discoverSchemaInputSchema,
    outputSchema: discoverSchemaOutputSchema,
    execute: async (input: DiscoverSchemaInput) => {
      return await discoverSchema(options.sdk, input);
    },
  });
}
