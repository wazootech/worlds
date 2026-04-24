import type { Source, TransactionMode } from "@wazoo/worlds-spec";

import type { WorldsRegistry } from "../testing/registry.ts";

export type NamedSource = {
  name: string;
  mode?: TransactionMode;
};

export type QualifiedSource = {
  id?: string;
  namespace?: string;
  mode?: TransactionMode;
};

export type BaseSource = {
  mode?: TransactionMode;
};

export type FullyQualifiedSource = {
  id: string;
  namespace: string;
  mode: TransactionMode;
};

export type ResolvedSource = Partial<FullyQualifiedSource>;

export interface ResolverConfig {
  defaultNamespace?: string;
  defaultId?: string;
}

let _config: ResolverConfig = {};

export function setResolverConfig(config: ResolverConfig): void {
  _config = { ..._config, ...config };
}

export function getResolverConfig(): ResolverConfig {
  return { ..._config };
}

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
    typeof (source as Record<string, unknown>).name === "string"
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
  registry?: Partial<WorldsRegistry>,
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
      id: parsed.id,
      namespace: parsed.namespace ?? registry?.namespace,
      mode: "deferred",
    };
  }

  const mode: TransactionMode = (source as { mode?: TransactionMode }).mode ??
    ((source as { write?: boolean }).write ? "write" : "deferred");

  if (isNamedSource(source)) {
    if (!source.name || !source.name.trim()) {
      throw new SourceParseError("Source name cannot be empty");
    }
    const parsed = parseSourceName(source.name);
    return {
      id: parsed.id,
      namespace: parsed.namespace ?? registry?.namespace,
      mode,
    };
  }

  if (isQualifiedSource(source)) {
    const worldId = "id" in source ? source.id : undefined;
    const namespace = ("namespace" in source ? source.namespace : undefined) ||
      registry?.namespace;

    return {
      id: worldId,
      namespace,
      mode,
    };
  }

  if (isBaseSource(source)) {
    return {
      id: undefined,
      namespace: registry?.namespace,
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
      id?: string;
      namespace?: string;
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
      id: obj.id as string | undefined,
      namespace: obj.namespace as string | undefined,
    };
  }

  if (!resolved.namespace && !resolved.id) return "";
  if (!resolved.namespace) return resolved.id ?? "";
  return `${resolved.namespace}/${resolved.id ?? ""}`;
}
