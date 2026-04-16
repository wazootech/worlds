import {
  defaultWorldsNamespaceNameSegment as defaultNamespace,
  defaultWorldsWorldNameSegment as defaultWorld,
} from "./ontology.ts";
import type { WorldsSource } from "#/schemas/mod.ts";
import type { WorldsContext } from "#/core/types.ts";

export {
  defaultNamespace as defaultWorldsNamespaceNameSegment,
  defaultWorld as defaultWorldsWorldNameSegment,
};

/**
 * ResolvedSource represents a fully resolved world + namespace pair.
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
 * resolveSource converts various input forms into a ResolvedSource.
 *
 * Input formats:
 * - "world" - uses context namespace or default
 * - "namespace/world" - explicit namespace and world
 * - "_/world" - underscore means use context namespace
 * - { name: "namespace/world" } - object form
 *
 * @throws SourceParseError on invalid input (multiple slashes)
 */
export function resolveSource(
  source: WorldsSource,
  context?: Partial<WorldsContext>,
): ResolvedSource {
  let name: string | null = null;

  if (typeof source === "string") {
    name = source;
  } else if (typeof source === "object" && source !== null) {
    if ("name" in source && source.name) {
      name = source.name;
    } else {
      throw new SourceParseError(
        "Invalid source format: missing 'name' property",
      );
    }
  } else {
    throw new SourceParseError("Invalid source format");
  }

  const parsed = parseSourceName(name);

  return {
    world: parsed.world ?? context?.world ?? defaultWorld,
    namespace: parsed.namespace ?? context?.namespace ?? defaultNamespace,
  };
}

/**
 * toWorldName returns a "namespace/world" string representation.
 * Uses resolveSource internally.
 *
 * @throws SourceParseError on invalid input
 */
export function toWorldName(
  source:
    | WorldsSource
    | ResolvedSource
    | {
        world?: string | null;
        namespace?: string | null;
      },
): string {
  let resolved: ResolvedSource;

  if (typeof source === "string" || (typeof source === "object" && source !== null && "name" in source)) {
    resolved = resolveSource(source);
  } else {
    resolved = {
      world: source.world ?? defaultWorld,
      namespace: source.namespace ?? defaultNamespace,
    };
  }

  const ns = resolved.namespace === defaultNamespace ? "_" : resolved.namespace;
  const ws = resolved.world === defaultWorld ? "_" : resolved.world;
  return `${ns}/${ws}`;
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
