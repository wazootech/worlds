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
  LogEntry: "https://schema.wazoo.dev/worlds#LogEntry",

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
  hasLevel: "https://schema.wazoo.dev/worlds#hasLevel", // LogEntry -> String
  hasMessage: "https://schema.wazoo.dev/worlds#hasMessage", // LogEntry -> String
  hasMetadata: "https://schema.wazoo.dev/worlds#hasMetadata", // LogEntry -> String (JSON)
  createdAt: "https://schema.wazoo.dev/worlds#createdAt", // Any -> Number (timestamp)
} as const;

/**
 * WORLDS_WORLD_SLUG is the reserved identifier for the platform worlds world.
 */
export const WORLDS_WORLD_SLUG: string = Deno.env.get("WORLDS_WORLD_SLUG") ??
  "worlds";

/**
 * WORLDS_WORLD_NAMESPACE is the default namespace for the platform worlds.
 */
export const WORLDS_WORLD_NAMESPACE: string =
  Deno.env.get("WORLDS_WORLD_NAMESPACE") ?? "_";

/**
 * DEFAULT_NAMESPACE is the reserved identifier for the default namespace.
 * It expands to the caller's tenant namespace or {@link WORLDS_WORLD_NAMESPACE}.
 */
export const DEFAULT_NAMESPACE: string | null = null;

/**
 * DEFAULT_WORLD is the reserved default world identifier when a path omits the world segment.
 */
export const DEFAULT_WORLD: string | null = null;
