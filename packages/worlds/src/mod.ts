// Core Entry Points
export { Worlds, Worlds as LocalWorlds } from "./engine/service.ts";
export { WorldsClient, WorldsClient as RemoteWorlds } from "./sdk/client.ts";
export { createWorlds, createWorldsContext } from "./engine/factory.ts";
export { createTestContext } from "./testing/context.ts";

// Types
export type { WorldsEngine } from "./engine/service.ts";
export type { WorldsContext } from "./engine/factory.ts";

// Utilities
export { isSparqlUpdate } from "./utils.ts";
export { resolveSource, toWorldName } from "./sources/resolver.ts";

export * from "./schema.ts";
