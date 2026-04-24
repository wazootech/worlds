// Core Entry Points
export { Worlds, EmbeddedWorlds, type WorldsInterface, type WorldsOptions, type EmbeddedWorldsOptions } from "./engine/service.ts";

// Config
export { resolveConfig, parseUrl } from "./config.ts";

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