import { DEFAULT_WORLD, WORLDS_WORLD_NAMESPACE } from "./ontology.ts";

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
      resolvedNamespace === "" || resolvedNamespace === "_") &&
    (world === undefined || world === null || world === "" || world === "_")
  ) {
    return worldPrimaryPath();
  }

  const s = encodeURIComponent(world ?? DEFAULT_WORLD ?? "_");
  if (
    resolvedNamespace === undefined || resolvedNamespace === null ||
    resolvedNamespace === "" || resolvedNamespace === "_"
  ) {
    return `/worlds/${s}`;
  }
  return `/namespaces/${encodeURIComponent(resolvedNamespace)}/worlds/${s}`;
}

/**
 * expandPathNamespace maps the reserved path segment to the caller's
 * default namespace, or the platform namespace when none is provided.
 */
export function expandPathNamespace(
  pathNamespaceSegment: string | null,
  tenantDefaultNamespace?: string,
): string {
  if (
    pathNamespaceSegment !== null && pathNamespaceSegment !== "_" &&
    pathNamespaceSegment !== "-"
  ) {
    return pathNamespaceSegment;
  }
  return tenantDefaultNamespace ?? WORLDS_WORLD_NAMESPACE;
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
    return DEFAULT_WORLD;
  }
  return pathWorldSegment;
}
