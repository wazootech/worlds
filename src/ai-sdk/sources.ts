import type { Source } from "./interfaces.ts";

/**
 * parseSources validates and normalizes a list of sources.
 */
export function parseSources(sources: Array<string | Source>): Source[] {
  const seen = new Set<string>();
  return sources.map((source) => {
    const parsed: Source = typeof source === "string" ? { id: source } : source;
    if (seen.has(parsed.id)) {
      throw new Error(`Duplicate source ID: ${parsed.id}`);
    }

    seen.add(parsed.id);
    return parsed;
  });
}
