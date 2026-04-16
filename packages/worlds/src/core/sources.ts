import { defaultNamespace, defaultWorld } from "./ontology.ts";
import type { WorldsSource } from "#/schemas/mod.ts";
import type { WorldsContext } from "#/core/types.ts";

export { defaultNamespace, defaultWorld };

/**
 * expandPathNamespace resolves a namespace with fallback to a default.
 * If namespace is null/undefined, returns the defaultNamespace.
 * Otherwise returns the provided namespace.
 */
export function expandPathNamespace(
  namespace: string | null | undefined,
  defaultNs: string | null | undefined = defaultNamespace,
): string | null {
  if (namespace === null || namespace === undefined) {
    return defaultNs ?? null;
  }
  return namespace;
}

/**
 * ResolvedSource represents a fully resolved world + namespace pair.
 */
export interface ResolvedSource {
  world?: string;
  namespace?: string;
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
  _context?: Partial<WorldsContext>,
): ResolvedSource {
  let name: string | null = null;

  if (source === null || source === undefined) {
    return {};
  }

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
    world: parsed.world ?? defaultWorld,
    namespace: parsed.namespace ?? defaultNamespace,
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

  if (
    typeof source === "string" ||
    (typeof source === "object" && source !== null && "name" in source)
  ) {
    resolved = resolveSource(source);
  } else {
    resolved = {
      world: source.world ?? defaultWorld,
      namespace: source.namespace ?? defaultNamespace,
    };
  }

  if (resolved.namespace === undefined && resolved.world === undefined) {
    return "";
  }

  if (resolved.namespace === undefined) {
    return resolved.world ?? "";
  }

  return `${resolved.namespace}/${resolved.world ?? ""}`;
}

/**
 * parseSourceName parses a "namespace/world" string into components.
 * Returns null for "_" segments (to be resolved by context).
 *
 * @throws SourceParseError on invalid format (multiple slashes)
 */
function parseSourceName(
  source: string,
): ResolvedSource {
  const trimmed = source.trim();
  if (!trimmed || trimmed === "_") return {};

  const slashIndex = trimmed.indexOf("/");
  if (slashIndex === -1) {
    return { world: (trimmed === "" || trimmed === "_") ? undefined : trimmed };
  }

  const secondSlash = trimmed.indexOf("/", slashIndex + 1);
  if (secondSlash !== -1) {
    throw new SourceParseError(
      `Invalid source format: multiple slashes in "${trimmed}"`,
    );
  }

  const namespaceInput = trimmed.slice(0, slashIndex);
  const worldInput = trimmed.slice(slashIndex + 1);

  const namespace = (namespaceInput === "" || namespaceInput === "_")
    ? undefined
    : namespaceInput;
  const world = (worldInput === "" || worldInput === "_")
    ? undefined
    : worldInput;

  return {
    namespace,
    world,
  };
}
