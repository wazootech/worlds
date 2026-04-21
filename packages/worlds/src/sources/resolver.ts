import type { WorldsSource } from "#/schemas/input.ts";
import type { WorldsContext } from "#/testing/context.ts";

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
 * ParsedSource represents a fully resolved world + namespace pair.
 */
export interface ParsedSource {
  world?: string;
  namespace?: string;
  id?: string;
}


/**
 * parseSourceName parses a "namespace/world" string into components.
 */
function parseSourceName(source: string): ParsedSource {
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

  const slashParts = trimmed.split("/");
  if (slashParts.length > 2) {
    throw new SourceParseError(
      `Invalid source format: strictly flat namespace format required (max one slash) in "${trimmed}"`,
    );
  }

  if (slashParts.length === 1) {
    return { world: trimmed };
  }

  const namespace = slashParts[0];
  const world = slashParts[1];

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
 * resolveSource converts various input forms into a ParsedSource.
 */
export function resolveSource(
  source?: WorldsSource,
  context?: Partial<WorldsContext>,
): ParsedSource {
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
      namespace: parsed.namespace ?? context?.namespace ?? defaultNamespace,
    };
  }

  if (typeof source === "object" && source !== null) {
    const obj = source as Record<string, unknown>;
    if (
      "name" in obj && typeof obj.name === "string" &&
      obj.name
    ) {
      const parsed = parseSourceName(obj.name);
      return {
        world: parsed.world ?? defaultWorld,
        namespace: parsed.namespace ?? context?.namespace ?? defaultNamespace,
      };
    }

    if ("world" in obj || "namespace" in obj || "id" in obj) {
      // Use logical OR with fallback to ensure we don't return undefined if one key exists but is empty
      const worldId = (obj.world as string | undefined) ||
        (obj.id as string | undefined) ||
        defaultWorld;
      const namespace = (obj.namespace as string | undefined) ||
        context?.namespace ||
        defaultNamespace;

      return {
        world: worldId,
        namespace,
        id: obj.id as string | undefined,
      };
    }

    throw new SourceParseError(
      "Invalid source format: missing 'name', 'world', or 'namespace' property",
    );
  }

  throw new SourceParseError("Invalid source format");
}

/**
 * toWorldName returns a "namespace/world" string representation.
 */
export function toWorldName(
  source:
    | WorldsSource
    | ParsedSource
    | {
      world?: string | null;
      namespace?: string | null;
    },
): string {
  let resolved: ParsedSource;

  if (
    typeof source === "string" ||
    (typeof source === "object" && source !== null && "name" in source)
  ) {
    resolved = resolveSource(source as WorldsSource);
  } else {
    const obj = source as Record<string, unknown>;
    resolved = {
      world: (obj.world as string | undefined) ??
        (obj.id as string | undefined) ?? defaultWorld,
      namespace: (obj.namespace as string | undefined) ?? defaultNamespace,
    };
  }

  if (!resolved.namespace && !resolved.world) return "";
  if (!resolved.namespace) return resolved.world ?? "";
  return `${resolved.namespace}/${resolved.world ?? ""}`;
}
