/**
 * REGISTRY is the core ontology for the Worlds platform control plane.
 * These URIs are used in the reserved Registry World (slug "registry") to manage
 * multitenancy, identity, and world registries.
 */
export const REGISTRY = {
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
 * REGISTRY_WORLD_ID is the reserved identifier for the platform registry world.
 */
export const REGISTRY_WORLD_ID: string = "registry";

/**
 * REGISTRY_NAMESPACE_ID is the default namespace ID for the platform registry.
 */
export const REGISTRY_NAMESPACE_ID: string = "https://wazoo.dev/registry";
