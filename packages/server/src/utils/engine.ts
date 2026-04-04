import { LocalWorlds } from "@wazoo/worlds-sdk";
import type { WorldsContext } from "@wazoo/worlds-sdk";

/**
 * getNamespacedEngine returns a Worlds engine scoped to the given namespace.
 */
export function getNamespacedEngine(
  appContext: WorldsContext,
  namespaceId?: string,
) {
  if (!namespaceId || namespaceId === appContext.namespaceId) {
    return appContext.engine!;
  }

  // Use a new engine instance for the specific namespace.
  // Context cloning ensures we don't pollute the global app context.
  return new LocalWorlds({ ...appContext, namespaceId });
}
