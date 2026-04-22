import type { WorldsRegistry } from "../engine/factory.ts";

export type { WorldsRegistry as WorldsContext };

/**
 * createTestContext is a legacy alias for createTestRegistry.
 */
export async function createTestContext(): Promise<WorldsRegistry> {
  const { createTestRegistry } = await import("./registry.ts");
  return await createTestRegistry();
}

/**
 * createTestNamespace creates a test namespace using the new registry.
 */
export async function createTestNamespace(
  registry: WorldsRegistry,
  options?: { plan?: string },
): Promise<{ id: string; apiKey: string | undefined }> {
  const { createTestNamespace: create } = await import("./registry.ts");
  return await create(registry, options);
}
