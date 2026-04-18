import type { WorldsSource } from "#/schema.ts";
import type { WorldsContext } from "#/types.ts";

/**
 * defaultNamespace is the fallback used when storing/looking up
 * namespace-agnostic data in storage or database keys.
 */
export const defaultNamespace: string | undefined = undefined;

/**
 * expandPathNamespace resolves a namespace segment, treating "_" or null as the default.
 */
export function expandPathNamespace(
  ns: string | null,
  defaultNs?: string | null,
): string | undefined {
  if (ns === "_" || ns === null) return defaultNs ?? undefined;
  return ns;
}

/**
 * defaultWorld is the fallback used when storing/looking up
 * world-agnostic data in storage or database keys.
 */
export const defaultWorld: string | undefined = undefined;

/**
 * ResolvedSource represents a fully resolved world + namespace pair.
 */
export interface ResolvedSource {
  world?: string;
  namespace?: string;
}

/**
 * parseSourceName parses a "namespace/world" string into components.
 */
function parseSourceName(source: string): ResolvedSource {
  const trimmed = source.trim();
  if (!trimmed || trimmed === "_") return {};

  if (/[\\ ]/.test(trimmed)) {
    throw new SourceParseError(
      `Invalid source format: backslash and space characters are not allowed in "${trimmed}"`,
    );
  }

  if (/[^a-zA-Z0-9_/\-.:]/.test(trimmed)) {
    throw new SourceParseError(
      `Invalid source format: invalid alphanumeric characters in "${trimmed}"`,
    );
  }

  // deno-lint-ignore no-control-regex
  if (/[^\x00-\x7f]/.test(trimmed)) {
    throw new SourceParseError(
      `Invalid source format: non-ASCII characters are not allowed in "${trimmed}"`,
    );
  }

  if (trimmed.startsWith("/") || trimmed.endsWith("/")) {
    throw new SourceParseError(
      `Invalid source format: leading or trailing slash not allowed in "${trimmed}"`,
    );
  }

  const slashIndex = trimmed.lastIndexOf("/");
  if (slashIndex === -1) {
    return { world: trimmed };
  }

  const namespace = trimmed.slice(0, slashIndex);
  const world = trimmed.slice(slashIndex + 1);

  return {
    namespace: (namespace === "" || namespace === "_") ? undefined : namespace,
    world: (world === "" || world === "_") ? undefined : world,
  };
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
 */
export function resolveSource(
  source: WorldsSource,
  _context?: Partial<WorldsContext>,
): ResolvedSource {
  if (source === null || source === undefined) {
    return {};
  }

  if (typeof source === "string") {
    if (source === "" || source === "_") {
      return {};
    }
    const parsed = parseSourceName(source);
    return {
      world: parsed.world ?? defaultWorld,
      namespace: parsed.namespace ?? _context?.namespace ?? defaultNamespace,
    };
  }

  if (typeof source === "object" && source !== null) {
    if (
      "name" in source && typeof (source as any).name === "string" &&
      (source as any).name
    ) {
      const parsed = parseSourceName((source as any).name);
      return {
        world: parsed.world ?? defaultWorld,
        namespace: parsed.namespace ?? _context?.namespace ?? defaultNamespace,
      };
    }

    if ("world" in source || "namespace" in source || "id" in source) {
      // Use logical OR with fallback to ensure we don't return undefined if one key exists but is empty
      const worldId = (source as any).world || (source as any).id ||
        defaultWorld;
      const namespace = (source as any).namespace || _context?.namespace ||
        defaultNamespace;

      return {
        world: worldId,
        namespace,
      };
    }

    throw new SourceParseError(
      "Invalid source format: missing 'name', 'world', or 'namespace' property",
    );
  }

  throw new SourceParseError("Invalid source format");
}

/**
 * resolveNamespace parses a source and extracts the namespace component.
 */
export function resolveNamespace(
  source: WorldsSource,
  defaultNs?: string | null,
): string | undefined {
  const resolved = resolveSource(source);
  return resolved.namespace ?? defaultNs ?? undefined;
}

/**
 * resolveWorldId parses a source and extracts the world ID component.
 */
export function resolveWorldId(
  source: WorldsSource,
  defaultW?: string | null,
): string | undefined {
  const resolved = resolveSource(source);
  return resolved.world ?? defaultW ?? undefined;
}

/**
 * toWorldName returns a "namespace/world" string representation.
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
    resolved = resolveSource(source as WorldsSource);
  } else {
    resolved = {
      world: (source as any).world ?? (source as any).id ?? defaultWorld,
      namespace: (source as any).namespace ?? defaultNamespace,
    };
  }

  if (!resolved.namespace && !resolved.world) return "";
  if (!resolved.namespace) return resolved.world ?? "";
  return `${resolved.namespace}/${resolved.world ?? ""}`;
}
