// Core Entry Points
export { Worlds, Worlds as LocalWorlds } from "./engine/service.ts";
export { WorldsClient, WorldsClient as RemoteWorlds } from "./sdk/client.ts";
export { createWorlds, initRegistry } from "./engine/factory.ts";

// Types
export type { WorldsEngine } from "./engine/service.ts";
export type { WorldsRegistry } from "./engine/factory.ts";
export type { ContentType as WorldsContentType } from "./api/v1/common.types.ts";
export type { WorldSource } from "./api/v1/source.types.ts";

// Testing Utilities
export { createTestNamespace, createTestRegistry } from "./testing/registry.ts";

// Utilities
export { isSparqlUpdate } from "./utils.ts";
export { resolveSource, toWorldName } from "./sources/resolver.ts";
export {
  type Serialization,
  SERIALIZATIONS,
} from "./infrastructure/rdf/core/serialization.ts";

// Export all API types (Request/Response) and resource types
export * from "./schema.ts";
