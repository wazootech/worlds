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
 * defaultNamespace is the fallback used when storing/looking up
 * namespace-agnostic data in storage or database keys.
 * In "namespace/world" parsing, "_" returns null to use context defaults.
 */
export const defaultNamespace: string | undefined = undefined;

/**
 * defaultWorld is the fallback used when storing/looking up
 * world-agnostic data in storage or database keys.
 * In "namespace/world" parsing, "_" returns null to use context defaults.
 */
export const defaultWorld: string | undefined = undefined;
