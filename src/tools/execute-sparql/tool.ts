import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { SparqlResult } from "#/sdk/types.ts";
import { Worlds } from "#/sdk/worlds.ts";
import type { CreateToolsOptions } from "#/tools/types.ts";
import {
  getDefaultSource,
  getSourceByWorldId,
  isUpdateQuery,
} from "#/tools/utils.ts";
import { formatExecuteSparqlDescription } from "#/tools/format.ts";

/**
 * createExecuteSparqlTool creates a tool that executes SPARQL queries and updates.
 */
export function createExecuteSparqlTool(
  options: CreateToolsOptions,
): Tool<{
  sparql: string;
  worldId?: string;
}, SparqlResult | null> {
  const worlds = new Worlds(options);

  return tool({
    description: formatExecuteSparqlDescription(options),
    inputSchema: z.object({
      sparql: z.string().describe(
        options.write
          ? "The SPARQL query or update to execute. Supports both read operations (SELECT, ASK, CONSTRUCT, DESCRIBE) and write operations (INSERT, DELETE, UPDATE, etc.)."
          : "The SPARQL query to execute (read-only: SELECT, ASK, CONSTRUCT, DESCRIBE).",
      ),
      worldId: z.string().optional().describe(
        "The ID of the world to execute the query against. If omitted, uses the default source.",
      ),
    }),
    execute: async ({ sparql, worldId }) => {
      // Determine which source to use
      let source;
      let resolvedWorldId: string;

      if (worldId) {
        source = getSourceByWorldId(options, worldId);
        if (!source) {
          throw new Error(
            `World ${worldId} is not configured in sources. Available worlds: ${
              options.sources?.map((s) => s.worldId).join(", ") ?? "none"
            }`,
          );
        }
        resolvedWorldId = worldId;
      } else {
        source = getDefaultSource(options.sources);
        if (!source) {
          throw new Error(
            "No default source configured and worldId was not provided. Please provide a worldId or configure a default source.",
          );
        }
        resolvedWorldId = source.worldId;
      }

      // Validate write permissions for update queries
      if (isUpdateQuery(sparql) && !options.write) {
        throw new Error(
          "Write operations are disabled. This tool is configured as read-only. " +
            "Only SELECT, ASK, CONSTRUCT, and DESCRIBE queries are allowed.",
        );
      }

      return await worlds.sparql(resolvedWorldId, sparql);
    },
  });
}
