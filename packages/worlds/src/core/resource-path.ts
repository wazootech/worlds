/**
 * worldResourcePath generates a path for a world resource.
 * Format: /worlds/{namespace}/{world}
 */
export function worldResourcePath(
  namespace?: string,
  world?: string,
): string {
  if (namespace === undefined && world === undefined) {
    return "/worlds";
  }

  if (namespace === undefined) {
    return `/worlds/${world}`;
  }

  return `/worlds/${namespace}/${world ?? ""}`;
}

/**
 * worldsActionPath generates a path for a global world action.
 */
export function worldsActionPath(action: string): string {
  return `/worlds/${action}`;
}

/**
 * worldFactPath generates a path for a world's facts.
 */
export function worldFactPath(
  namespace?: string,
  world?: string,
): string {
  return `${worldResourcePath(namespace, world)}/facts`;
}

/**
 * worldQueryPath generates a path for a world's SPARQL endpoint.
 */
export function worldQueryPath(
  namespace?: string,
  world?: string,
): string {
  return `${worldResourcePath(namespace, world)}/sparql`;
}

/**
 * worldSearchPath generates a path for a world's search endpoint.
 */
export function worldSearchPath(
  namespace?: string,
  world?: string,
): string {
  return `${worldResourcePath(namespace, world)}/search`;
}

/**
 * resolvePathSegments extracts world and namespace from a resource path.
 */
export function resolvePathSegments(path: string): {
  namespace?: string;
  world?: string;
} {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "worlds") {
    return {};
  }

  if (parts.length === 1) {
    return {
      namespace: undefined,
      world: undefined,
    };
  }

  if (parts.length === 2) {
    return {
      namespace: undefined,
      world: parts[1],
    };
  }

  return {
    namespace: parts[1],
    world: parts[2],
  };
}
