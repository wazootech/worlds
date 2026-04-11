import type { WorldsInterface } from "#/core/types.ts";

/**
 * WorldsPlugin is an opt-in plugin that can be composed into a Worlds engine.
 * Plugins can inject ontology and data into the WORLDS world to make
 * entities queryable via SPARQL.
 */
export interface WorldsPlugin {
  /**
   * name returns the unique name of the plugin.
   */
  name: string;

  /**
   * initialize is called when the plugin is composed into a Worlds engine.
   * Use this to inject initial ontology (classes, properties) and bootstrap data.
   * @param worlds The Worlds engine instance.
   */
  initialize(worlds: WorldsInterface): Promise<void>;
}

/**
 * composePlugins combines multiple plugins into a single initialization function.
 * @param plugins The plugins to compose.
 * @returns A function that initializes all plugins in sequence.
 */
export function composePlugins(
  ...plugins: WorldsPlugin[]
): (worlds: WorldsInterface) => Promise<void> {
  return async (worlds: WorldsInterface) => {
    for (const plugin of plugins) {
      await plugin.initialize(worlds);
    }
  };
}
