import {
  defaultWorldsNamespaceNameSegment,
  defaultWorldsWorldNameSegment,
} from "./ontology.ts";
import type { WorldSource } from "#/schemas/mod.ts";
import type { WorldsContext } from "#/core/types.ts";

export { defaultWorldsNamespaceNameSegment, defaultWorldsWorldNameSegment };

/**
 * ResolvedSource represents a fully resolved world + namespace pair.
 * Uses context defaults or fallbacks.
 */
export interface ResolvedSource {
  world: string;
  namespace: string;
}

/**
 * SourceParseError is thrown when source parsing fails validation.
 */
export class SourceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceParseError";
  }
}

/**
 * toResolvedSource converts various input forms into a ResolvedSource.
 * Handles: WorldSource, { world, namespace }, "namespace/world" string
 *
 * String parsing: "_" returns null (use context defaults)
 * Object forms: null values use context defaults
 *
 * @throws SourceParseError on invalid input (multiple slashes, invalid format)
 */
export function toResolvedSource(
  source: WorldSource | { world?: string | null; namespace?: string | null },
  context?: Partial<WorldsContext>,
): ResolvedSource {
  let world: string | null = null;
  let namespace: string | null = null;

  if (typeof source === "string") {
    const parsed = parseSourceName(source);
    world = parsed.world;
    namespace = parsed.namespace;
  } else if (typeof source === "object" && source !== null) {
    const obj = source as { world?: string | null; namespace?: string | null };
    world = obj.world ?? null;
    namespace = obj.namespace ?? null;
  }

  return {
    world: world ?? context?.world ?? defaultWorldsWorldNameSegment,
    namespace: namespace ?? context?.namespace ??
      defaultWorldsNamespaceNameSegment,
  };
}

/**
 * toStorageName returns a "namespace:world" string for all keys.
 * Used for: cache keys, storage keys, database lookups.
 */
export function toStorageName(resolved: ResolvedSource): string {
  return `${resolved.namespace}:${resolved.world}`;
}

/**
 * parseSourceName parses a "namespace/world" string into components.
 * Returns null for "_" segments (to be resolved by context).
 *
 * @throws SourceParseError on invalid format (multiple slashes)
 */
function parseSourceName(
  source: string,
): { world: string | null; namespace: string | null } {
  const trimmed = source.trim();
  if (!trimmed) return { world: null, namespace: null };

  if (trimmed === "_") {
    return { world: null, namespace: null };
  }

  const slashIndex = trimmed.indexOf("/");
  if (slashIndex === -1) {
    return { world: trimmed, namespace: null };
  }

  const secondSlash = trimmed.indexOf("/", slashIndex + 1);
  if (secondSlash !== -1) {
    throw new SourceParseError(
      `Invalid source format: multiple slashes in "${trimmed}"`,
    );
  }

  const ns = trimmed.slice(0, slashIndex);
  const ws = trimmed.slice(slashIndex + 1);

  return {
    namespace: ns === "_" ? null : ns || null,
    world: ws === "_" ? null : ws || null,
  };
}
