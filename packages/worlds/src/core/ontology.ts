/**
 * WORLDS is the core ontology for the Worlds platform control plane.
 * These URIs are used in the reserved Worlds World to manage
 * multitenancy, identity, and world registries.
 */
export const WORLDS = {
  /**
   * NAMESPACE is the base URI for the worlds ontology.
   */
  NAMESPACE: "https://schema.wazoo.dev/worlds#",

  /**
   * BASE is the base URI for worlds entities.
   */
  BASE: "https://wazoo.dev/worlds/",

  /**
   * Classes
   */
  Namespace: "https://schema.wazoo.dev/worlds#Namespace",
  User: "https://schema.wazoo.dev/worlds#User",
  ApiKey: "https://schema.wazoo.dev/worlds#ApiKey",
  World: "https://schema.wazoo.dev/worlds#World",
  Chunk: "https://schema.wazoo.dev/worlds#Chunk",

  /**
   * Properties
   */
  belongsTo: "https://schema.wazoo.dev/worlds#belongsTo", // (World/ApiKey/Chunk) -> Namespace
  hasMember: "https://schema.wazoo.dev/worlds#hasMember", // Namespace -> User
  hasSecret: "https://schema.wazoo.dev/worlds#hasSecret", // ApiKey -> String
  hasSlug: "https://schema.wazoo.dev/worlds#hasSlug", // World -> String
  hasLabel: "https://schema.wazoo.dev/worlds#hasLabel", // Any -> String
  hasDescription: "https://schema.wazoo.dev/worlds#hasDescription", // Any -> String
  hasContent: "https://schema.wazoo.dev/worlds#hasContent", // Chunk -> String
  hasEmbedding: "https://schema.wazoo.dev/worlds#hasEmbedding", // Chunk -> String (vector as JSON)
  createdAt: "https://schema.wazoo.dev/worlds#createdAt", // Any -> Number (timestamp)
} as const;

/**
 * WORLDS_WORLD_ID is the reserved identifier for the platform worlds world.
 */
export const WORLDS_WORLD_ID: string = Deno.env.get("WORLDS_WORLD_ID") ??
  "worlds";

/**
 * WORLDS_NAMESPACE_ID is the default namespace ID for the platform worlds.
 */
export const WORLDS_NAMESPACE_ID: string =
  Deno.env.get("WORLDS_NAMESPACE_ID") ?? "https://wazoo.dev/worlds";

/**
 * DEFAULT_NAMESPACE is used when no namespace is specified.
 * Mirrors the RDF default graph concept.
 */
export const DEFAULT_NAMESPACE = "_";

