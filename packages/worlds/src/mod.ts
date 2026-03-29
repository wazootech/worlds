/**
 * @wazoo/worlds-sdk is the core SDK for interacting with the Worlds engine.
 * It provides both local (server-side) and remote (client-side) implementations
 * of the WorldsInterface.
 * @module
 */
export * from "./sdk.ts";
export * from "./local.ts";
/**
 * errors module provides structured error handling for the Worlds SDK.
 * @module
 */
export * from "./errors/errors.ts";
export * from "./remote.ts";
export * from "./schema.ts";
export * from "./types.ts";
export * from "./options.ts";
/**
 * WorldsContext is the shared context for the Worlds engine.
 */
export * from "./context.ts";
export * from "./engine-context.ts";
export { initializeDatabase as initializeServerDatabase } from "./database/init.ts";
export { MemoryDatabaseManager } from "./database/managers/memory-manager.ts";
export { generateBlobFromN3Store, generateN3StoreFromBlob } from "./rdf/n3.ts";
export * from "./factory.ts";
/**
 * Custom named exports for all subsystems.
 */
export * from "./database/mod.ts";
export * as database from "./database/mod.ts";

export * from "./rdf/core/serialization.ts";
export * as rdf from "./rdf/core/serialization.ts";

export * from "./rdf/patch/mod.ts";
export * as patch from "./rdf/patch/mod.ts";

export * from "./embeddings/mod.ts";
export * as embeddings from "./embeddings/mod.ts";

// Utilities
export { handleETagRequest } from "./http/etag.ts";
export { isSparqlUpdate } from "./utils.ts";
export { ErrorResponse } from "./errors/errors.ts";
