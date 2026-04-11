/**
 * @wazoo/worlds-sdk is the core SDK for interacting with the Worlds engine.
 * It provides both local (server-side) and remote (client-side) implementations
 * of the WorldsInterface.
 * @module
 */
export * from "./worlds/worlds.ts";
export * from "./worlds/local.ts";
export * from "./worlds/remote.ts";
export * from "./core/ontology.ts";
export * from "./core/types.ts";
export * from "./core/engine-context.ts";
export * from "./core/factory.ts";
export * from "./core/utils.ts";
export * from "#/schemas/mod.ts";
export * from "#/storage/init.ts";
export * from "#/storage/memory-manager.ts";
export * from "#/rdf/n3.ts";
export * from "#/plugins/registry/keys.repository.ts";
export * from "#/plugins/registry/worlds.repository.ts";
export * from "#/plugins/interface.ts";
export * from "#/plugins/chunks/plugin.ts";
export * from "#/plugins/namespaces/plugin.ts";
export * from "#/world/triples/repository.ts";
export * from "#/world/chunks/repository.ts";
export * from "#/rdf/core/serialization.ts";
export * from "#/rdf/patch/mod.ts";
export * from "#/embeddings/mod.ts";

