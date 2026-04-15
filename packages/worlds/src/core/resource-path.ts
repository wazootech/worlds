import {
  defaultWorldsNamespaceNameSegment,
  defaultWorldsWorldNameSegment,
} from "./ontology.ts";

/**
 * worldsActionPath returns the URL pathname for an RPC-style action.
 */
export function worldsActionPath(action: string): string {
  return `/worlds/rpc/${action}`;
}

/**
 * worldPrimaryPath returns the URL pathname for the default world.
 */
export function worldPrimaryPath(): string {
  return "/world";
}

/**
 * worldResourcePath returns the URL pathname for a single world resource.
 * Unqualified namespaces use the "/worlds/:world" shorthand.
 */
export function worldResourcePath(
  resolvedNamespace: string | undefined | null,
  world: string | null,
): string {
  if (
    (resolvedNamespace === undefined || resolvedNamespace === null ||
      resolvedNamespace === "" ||
      resolvedNamespace === defaultWorldsWorldNameSegment) &&
    (world === undefined || world === null || world === "" ||
      world === defaultWorldsWorldNameSegment)
  ) {
    return worldPrimaryPath();
  }

  const s = encodeURIComponent(world ?? defaultWorldsWorldNameSegment);
  if (
    resolvedNamespace === undefined || resolvedNamespace === null ||
    resolvedNamespace === "" ||
    resolvedNamespace === defaultWorldsWorldNameSegment
  ) {
    return `/worlds/${s}`;
  }
  return `/namespaces/${encodeURIComponent(resolvedNamespace)}/worlds/${s}`;
}

/**
 * expandPathNamespace maps the reserved path segment to the caller's
 * default namespace, or defaultWorldsNamespaceNameSegment when none is provided.
 */
export function expandPathNamespace(
  pathNamespaceSegment: string | null,
  tenantDefaultNamespace?: string,
): string {
  if (
    pathNamespaceSegment !== null &&
    pathNamespaceSegment !== defaultWorldsNamespaceNameSegment
  ) {
    return pathNamespaceSegment;
  }
  return tenantDefaultNamespace ?? defaultWorldsNamespaceNameSegment;
}

/**
 * expandPathWorld maps the reserved path segment to the default world.
 */
export function expandPathWorld(
  pathWorldSegment: string | null,
): string | null {
  if (
    pathWorldSegment === undefined || pathWorldSegment === "" ||
    pathWorldSegment === "_"
  ) {
    return null;
  }
  return pathWorldSegment;
}
