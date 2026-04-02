/**
 * KERNEL is the core ontology for the Worlds platform control plane.
 * These URIs are used in the reserved Kernel World (ID 0...0) to manage
 * multitenancy, identity, and world registries.
 */
export const KERNEL = {
  /**
   * NAMESPACE is the base URI for the kernel ontology.
   */
  NAMESPACE: "https://schema.wazoo.dev/kernel#",

  /**
   * BASE is the base URI for kernel entities.
   */
  BASE: "https://wazoo.dev/kernel/",

  /**
   * Classes
   */
  Organization: "https://schema.wazoo.dev/kernel#Organization",
  User: "https://schema.wazoo.dev/kernel#User",
  ApiKey: "https://schema.wazoo.dev/kernel#ApiKey",
  World: "https://schema.wazoo.dev/kernel#World",

  /**
   * Properties
   */
  belongsTo: "https://schema.wazoo.dev/kernel#belongsTo", // (World/ApiKey) -> Organization
  hasMember: "https://schema.wazoo.dev/kernel#hasMember", // Organization -> User
  hasSecret: "https://schema.wazoo.dev/kernel#hasSecret", // ApiKey -> String
  hasSlug: "https://schema.wazoo.dev/kernel#hasSlug", // World -> String
  hasLabel: "https://schema.wazoo.dev/kernel#hasLabel", // Any -> String
  hasDescription: "https://schema.wazoo.dev/kernel#hasDescription", // Any -> String
  createdAt: "https://schema.wazoo.dev/kernel#createdAt", // Any -> Number (timestamp)
} as const;

/**
 * KERNEL_WORLD_ID is the reserved ULID for the platform control plane world.
 */
export const KERNEL_WORLD_ID = "00000000000000000000000000";
