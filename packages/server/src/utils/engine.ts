import { LocalWorlds } from "@wazoo/worlds-sdk";
import type { WorldsContext } from "@wazoo/worlds-sdk";

/**
 * getNamespacedEngine returns a Worlds engine scoped to the given namespace.
 * Since namespace is now per-operation, this returns the existing engine.
 */
export function getNamespacedEngine(
  appContext: WorldsContext,
  _namespaceId?: string,
) {
  return appContext.engine!;
}


