import {
  DEFAULT_NAMESPACE,
  DEFAULT_SLUG,
  WORLDS_WORLD_NAMESPACE,
} from "#/core/ontology.ts";
import type { WorldsSearchInput } from "#/schemas/search.ts";
import type { WorldsSparqlInput } from "#/schemas/sparql.ts";

export { DEFAULT_SLUG };

/**
 * expandPathNamespace maps the reserved path segment "_" to the caller's
 * default namespace, or the platform namespace when none is provided.
 */
export function expandPathNamespace(
  pathNamespaceSegment: string,
  tenantDefaultNamespace?: string,
): string {
  if (pathNamespaceSegment !== DEFAULT_NAMESPACE) {
    return pathNamespaceSegment;
  }
  return tenantDefaultNamespace ?? WORLDS_WORLD_NAMESPACE;
}

/**
 * expandPathSlug supplies the default world slug when the path omits it.
 */
export function expandPathSlug(pathSlugSegment: string | undefined): string {
  if (pathSlugSegment === undefined || pathSlugSegment === "") {
    return DEFAULT_SLUG;
  }
  return pathSlugSegment;
}

/**
 * worldResourcePath returns the URL pathname for a single world resource.
 * Unqualified namespaces use the "/worlds/:slug" shorthand.
 */
export function worldResourcePath(
  resolvedNamespace: string | undefined,
  slug: string,
): string {
  const s = encodeURIComponent(slug);
  if (resolvedNamespace === undefined || resolvedNamespace === "") {
    return `/worlds/${s}`;
  }
  return `/namespaces/${encodeURIComponent(resolvedNamespace)}/worlds/${s}`;
}

/**
 * worldsCollectionSparqlPath is the POST path for SPARQL against a namespace collection.
 */
export function worldsCollectionSparqlPath(
  pathNamespaceSegment: string,
): string {
  const ns = encodeURIComponent(pathNamespaceSegment);
  return `/namespaces/${ns}/worlds/sparql`;
}

/**
 * worldsUnarySparqlPath is the POST path for SPARQL scoped to one world in the URL.
 */
export function worldsUnarySparqlPath(
  pathNamespaceSegment: string,
  pathSlugSegment: string,
): string {
  const ns = encodeURIComponent(pathNamespaceSegment);
  const slug = encodeURIComponent(pathSlugSegment);
  return `/namespaces/${ns}/worlds/${slug}/sparql`;
}

/**
 * worldsCollectionSearchPath is the POST path for search in a namespace collection.
 */
export function worldsCollectionSearchPath(
  pathNamespaceSegment: string,
): string {
  const ns = encodeURIComponent(pathNamespaceSegment);
  return `/namespaces/${ns}/worlds/search`;
}

/**
 * worldsUnarySearchPath is the POST path for search scoped to one world in the URL.
 */
export function worldsUnarySearchPath(
  pathNamespaceSegment: string,
  pathSlugSegment: string,
): string {
  const ns = encodeURIComponent(pathNamespaceSegment);
  const slug = encodeURIComponent(pathSlugSegment);
  return `/namespaces/${ns}/worlds/${slug}/search`;
}

/**
 * worldsUnaryImportPath is the POST path for import scoped to one world.
 */
export function worldsUnaryImportPath(
  pathNamespaceSegment: string,
  pathSlugSegment: string,
): string {
  const ns = encodeURIComponent(pathNamespaceSegment);
  const slug = encodeURIComponent(pathSlugSegment);
  return `/namespaces/${ns}/worlds/${slug}/import`;
}

/**
 * worldsUnaryExportPath is the POST path for export scoped to one world.
 */
export function worldsUnaryExportPath(
  pathNamespaceSegment: string,
  pathSlugSegment: string,
): string {
  const ns = encodeURIComponent(pathNamespaceSegment);
  const slug = encodeURIComponent(pathSlugSegment);
  return `/namespaces/${ns}/worlds/${slug}/export`;
}

/**
 * worldsShorthandCollectionSparqlPath is POST /worlds/sparql (default namespace segment elided).
 */
export function worldsShorthandCollectionSparqlPath(): string {
  return "/worlds/sparql";
}

/**
 * worldsShorthandUnarySparqlPath is POST /worlds/:slug/sparql.
 */
export function worldsShorthandUnarySparqlPath(
  pathSlugSegment: string,
): string {
  return `/worlds/${encodeURIComponent(pathSlugSegment)}/sparql`;
}

/**
 * worldsShorthandCollectionSearchPath is POST /worlds/search.
 */
export function worldsShorthandCollectionSearchPath(): string {
  return "/worlds/search";
}

/**
 * worldsShorthandUnarySearchPath is POST /worlds/:slug/search.
 */
export function worldsShorthandUnarySearchPath(
  pathSlugSegment: string,
): string {
  return `/worlds/${encodeURIComponent(pathSlugSegment)}/search`;
}

/**
 * worldsShorthandUnaryImportPath is POST /worlds/:slug/import.
 */
export function worldsShorthandUnaryImportPath(
  pathSlugSegment: string,
): string {
  return `/worlds/${encodeURIComponent(pathSlugSegment)}/import`;
}

/**
 * worldsShorthandUnaryExportPath is POST /worlds/:slug/export.
 */
export function worldsShorthandUnaryExportPath(
  pathSlugSegment: string,
): string {
  return `/worlds/${encodeURIComponent(pathSlugSegment)}/export`;
}

/**
 * mergeSparqlInputFromPath merges URL scope with a JSON body for SPARQL.
 */
export function mergeSparqlInputFromPath(
  pathNamespaceRaw: string,
  pathSlugRaw: string | undefined,
  body: WorldsSparqlInput,
  tenantDefaultNamespace?: string,
): WorldsSparqlInput {
  const effectiveNs = expandPathNamespace(
    pathNamespaceRaw,
    tenantDefaultNamespace,
  );
  const base: WorldsSparqlInput = {
    ...body,
    namespace: body.namespace ?? effectiveNs,
  };
  if (pathSlugRaw !== undefined) {
    const slug = expandPathSlug(pathSlugRaw);
    if (!base.sources?.length) {
      return {
        ...base,
        sources: [{ namespace: effectiveNs, slug }],
      };
    }
  }
  return base;
}

/**
 * mergeSearchInputFromPath merges URL scope with a JSON body for search.
 */
export function mergeSearchInputFromPath(
  pathNamespaceRaw: string,
  pathSlugRaw: string | undefined,
  body: WorldsSearchInput,
  tenantDefaultNamespace?: string,
): WorldsSearchInput {
  const effectiveNs = expandPathNamespace(
    pathNamespaceRaw,
    tenantDefaultNamespace,
  );
  const base: WorldsSearchInput = {
    ...body,
    namespace: body.namespace ?? effectiveNs,
  };
  if (pathSlugRaw !== undefined) {
    const slug = expandPathSlug(pathSlugRaw);
    if (!base.sources?.length) {
      return {
        ...base,
        sources: [{ namespace: effectiveNs, slug }],
      };
    }
  }
  return base;
}
