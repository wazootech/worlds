// Core Entry Points
export { Worlds, Worlds as LocalWorlds } from "./engine/service.ts";
export {
  RemoteWorldsData,
  RemoteWorldsManagement,
  WorldsClient,
} from "./sdk/client.ts";
export { createWorlds, initRegistry } from "./engine/factory.ts";

// Types
export type { ContentType, Source, TransactionMode } from "./api/v1/types.gen.ts";

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
