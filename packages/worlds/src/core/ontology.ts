/**
 * WORLDS is the core ontology for the Worlds platform control plane.
 * These URIs are used in the reserved Worlds World to manage
 * multitenancy, identity, and world registries.
 */
export const WORLDS = {
  /**
   * NAMESPACE is the base URI for the registry ontology.
   */
  NAMESPACE: "https://schema.wazoo.dev/registry#",

  /**
   * BASE is the base URI for registry entities.
   */
  BASE: "https://wazoo.dev/registry/",

  /**
   * Classes
   */
  Namespace: "https://schema.wazoo.dev/registry#Namespace",
  User: "https://schema.wazoo.dev/registry#User",
  ApiKey: "https://schema.wazoo.dev/registry#ApiKey",
  World: "https://schema.wazoo.dev/registry#World",

  /**
   * Properties
   */
  belongsTo: "https://schema.wazoo.dev/registry#belongsTo", // (World/ApiKey) -> Namespace
  hasMember: "https://schema.wazoo.dev/registry#hasMember", // Namespace -> User
  hasSecret: "https://schema.wazoo.dev/registry#hasSecret", // ApiKey -> String
  hasSlug: "https://schema.wazoo.dev/registry#hasSlug", // World -> String
  hasLabel: "https://schema.wazoo.dev/registry#hasLabel", // Any -> String
  hasDescription: "https://schema.wazoo.dev/registry#hasDescription", // Any -> String
  createdAt: "https://schema.wazoo.dev/registry#createdAt", // Any -> Number (timestamp)
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

