// Core Entry Points
export { Worlds, EmbeddedWorlds, RemoteWorlds, type WorldsInterface, type WorldsOptions, type EmbeddedWorldsOptions, type RemoteWorldsOptions } from "./engine/service.ts";

// Types
export type { ContentType, Source, TransactionMode } from "@wazoo/worlds-spec";
export type {
  DataPlane,
  ManagementPlane,
} from "./engine/service.ts";

// Utilities
export { isSparqlUpdate } from "./utils.ts";
export {
  resolveSource,
  setResolverConfig,
  toWorldName,
} from "./sources/resolver.ts";
export type { ResolverConfig } from "./sources/resolver.ts";
export {
  type Serialization,
  SERIALIZATIONS,
} from "./infrastructure/rdf/core/serialization.ts";

// Export all API types (Request/Response) and resource types
export * from "./schema.ts";