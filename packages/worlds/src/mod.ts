// Core Entry Points
export {
  EmbeddedWorlds,
  type EmbeddedWorldsOptions,
  Worlds,
  type WorldsInterface,
  type WorldsOptions,
} from "./engine/service.ts";

// Config
export { parseUrl, resolveConfig } from "./config.ts";

// Types
export type { ContentType, Source, TransactionMode } from "@wazoo/worlds-spec";
export type { DataPlane, ManagementPlane } from "./engine/service.ts";

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

// Public API types (Request/Response, World, etc.)
export * from "./schema.ts";

// Internal types for advanced users
export * as WorldsInternal from "./internal/mod.ts";
