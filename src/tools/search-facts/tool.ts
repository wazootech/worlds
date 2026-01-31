import type { Tool } from "ai";
import { tool } from "ai";
import { z } from "zod";
import type { SearchResult, SearchResultItem } from "#/sdk/worlds/schema.ts";
import { Worlds } from "#/sdk/worlds/sdk.ts";
import type { CreateToolsOptions } from "#/tools/types.ts";
import { formatSearchFactsDescription } from "#/tools/format.ts";
import { normalizeSources } from "#/tools/utils.ts";

/**
 * createSearchFactsTool creates a search facts tool for a world.
 */
export function createSearchFactsTool(options: CreateToolsOptions): Tool<
  {
    query: string;
    limit?: number | undefined;
  },
  SearchResult<SearchResultItem>[]
> {
  const worlds = new Worlds(options);
  return tool({
    description: formatSearchFactsDescription(options),
    inputSchema: z.object({
      query: z.string().describe(
        "A text query to search for facts. Can be an entity name, description, or any text that might match facts in the knowledge base. Examples: 'Ethan', 'Nancy', 'meeting at cafe', 'person named John'.",
      ),
      limit: z.number().min(1).max(100).optional().describe(
        "Maximum number of facts to return (default: 10). Use lower limits for focused searches, higher limits when exploring broadly.",
      ),
    }),
    execute: async ({ query, limit }) => {
      const normalizedSources = normalizeSources(options.sources);
      const worldIds = normalizedSources.map((source) => source.worldId);
      return await worlds.search(query, {
        worldIds,
        limit: limit ?? 10,
      });
    },
  });
}
