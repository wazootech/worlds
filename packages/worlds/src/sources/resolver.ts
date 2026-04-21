import type { TransactionMode } from "../api/v1/common.schema.ts";
import type {
  BaseSource,
  FullyQualifiedSource,
  NamedSource,
  QualifiedSource,
  Source,
} from "../api/v1/source.schema.ts";

import type { WorldsContext } from "../testing/context.ts";


/**
 * defaultNamespace is the fallback used when storing/looking up
 * namespace-agnostic data in storage or database keys.
 */
export const defaultNamespace: string | undefined = Deno.env.get("WORLDS_NS");

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
export const defaultWorld: string | undefined = Deno.env.get("WORLDS_ID");

/**
 * isNamedSource checks if a source is an object with a 'name' property.
 */
export function isNamedSource(
  source: unknown,
): source is NamedSource {
  return (
    typeof source === "object" &&
    source !== null &&
    "name" in source &&
    typeof (source as any).name === "string"
  );
}

/**
 * isQualifiedSource checks if a source is an object with 'namespace' or 'id' properties.
 */
export function isQualifiedSource(
  source: unknown,
): source is QualifiedSource {
  return (
    typeof source === "object" &&
    source !== null &&
    ("namespace" in source || "id" in source) &&
    !("name" in source)
  );
}

/**
 * isBaseSource checks if a source is a base object source (Default Source).
 */
export function isBaseSource(
  source: unknown,
): source is BaseSource {
  return (
    typeof source === "object" &&
    source !== null &&
    !Array.isArray(source) &&
    !("name" in source) &&
    !("namespace" in source) &&
    !("id" in source)
  );
}

/**
 * isSource checks if a value is a valid Source input.
 */
export function isSource(source: unknown): source is Source {
  return (
    typeof source === "string" ||
    isNamedSource(source) ||
    isQualifiedSource(source) ||
    isBaseSource(source)
  );
}

/**
 * ResolvedSource represents a fully resolved world + namespace pair,
 * potentially carrying a transaction mode.
 */
export type ResolvedSource = Partial<FullyQualifiedSource>;


/**
 * parseSourceName parses a "namespace/world" string into components.
 */
function parseSourceName(source: string): ResolvedSource {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new SourceParseError("Source name cannot be empty");
  }

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
    return { id: trimmed };
  }

  const namespace = slashParts[0];
  const world = slashParts[1];

  return {
    namespace: (namespace === "" || namespace === "_") ? undefined : namespace,
    id: (world === "") ? undefined : world,
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
  source?: Source,
  context?: Partial<WorldsContext>,
): ResolvedSource {
  if (source === null || source === undefined) {
    return { mode: "deferred" };
  }

  if (typeof source === "string") {
    if (source === "") {
      throw new SourceParseError("Source name cannot be empty");
    }
    const parsed = parseSourceName(source);
    return {
      id: parsed.id ?? defaultWorld,
      namespace: parsed.namespace ?? context?.namespace ?? defaultNamespace,
      mode: "deferred",
    };
  }

  const mode: TransactionMode = (source as any).mode ?? "deferred";

  if (isNamedSource(source)) {
    if (!source.name.trim()) {
      throw new SourceParseError("Source name cannot be empty");
    }
    const parsed = parseSourceName(source.name);
    return {
      id: parsed.id ?? defaultWorld,
      namespace: parsed.namespace ?? context?.namespace ?? defaultNamespace,
      mode,
    };
  }

  if (isQualifiedSource(source)) {
    const worldId = ("id" in source ? source.id : undefined) || defaultWorld;
    const namespace = ("namespace" in source ? source.namespace : undefined) ||
      context?.namespace ||
      defaultNamespace;

    return {
      id: worldId,
      namespace,
      mode,
    };
  }

  if (isBaseSource(source)) {
    return {
      id: defaultWorld,
      namespace: context?.namespace || defaultNamespace,
      mode,
    };
  }

  if (typeof source === "object") {
    throw new SourceParseError(
      "Invalid source format: missing 'name', 'id', or 'namespace' property",
    );
  }

  throw new SourceParseError("Invalid source format");
}

/**
 * toWorldName returns a "namespace/world" string representation.
 */
export function toWorldName(
  source:
    | Source
    | ResolvedSource
    | {
      id?: string | null;
      namespace?: string | null;
    },
): string {
  let resolved: ResolvedSource;

  if (typeof source === "string" || isNamedSource(source)) {
    resolved = resolveSource(source);
  } else if (isQualifiedSource(source) || isBaseSource(source)) {
    resolved = resolveSource(source);
  } else {
    // Handling ResolvedSource or other objects
    const obj = source as Record<string, unknown>;
    resolved = {
      id: (obj.id as string | undefined) ?? defaultWorld,
      namespace: (obj.namespace as string | undefined) ?? defaultNamespace,
    };
  }

  if (!resolved.namespace && !resolved.id) return "";
  if (!resolved.namespace) return resolved.id ?? "";
  return `${resolved.namespace}/${resolved.id ?? ""}`;
}
