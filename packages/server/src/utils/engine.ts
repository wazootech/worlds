import type { WorldsContext } from "@wazoo/worlds-sdk";

/**
 * getNamespacedEngine returns a Worlds engine scoped to the given namespace.
 *
 * Isolation is achieved through per-operation namespace options passed to the
 * underlying engine methods, not through separate engine instances. The namespace
 * parameter is retained for API compatibility but namespace enforcement happens
 * at the LocalWorlds layer via assertSourceAuthorized.
 */
export function getNamespacedEngine(
  appContext: WorldsContext,
  _namespaceId?: string,
) {
  return appContext.engine!;
}
