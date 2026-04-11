import { z } from "zod";

/**
 * RegistryNamespace represents a namespace in the registry.
 */
export interface RegistryNamespace {
  /**
   * id is the unique IRI of the namespace.
   */
  id: string;

  /**
   * slug is the URL-friendly name.
   */
  slug: string;

  /**
   * label is the human-readable name.
   */
  label: string;
}

/**
 * registryNamespaceSchema is the Zod schema for RegistryNamespace.
 */
export const registryNamespaceSchema: z.ZodType<RegistryNamespace> = z.object({
  id: z.string().url(),
  slug: z.string(),
  label: z.string(),
});

/**
 * RegistryApiKey represents an API key in the registry.
 */
export interface RegistryApiKey {
  /**
   * id is the unique IRI of the key.
   */
  id: string;

  /**
   * namespaceId is the IRI of the namespace this key belongs to.
   */
  namespaceId: string;

  /**
   * secret is the raw Bearer token value.
   */
  secret: string;
}

/**
 * registryApiKeySchema is the Zod schema for RegistryApiKey.
 */
export const registryApiKeySchema: z.ZodType<RegistryApiKey> = z.object({
  id: z.string().url(),
  namespaceId: z.string().url(),
  secret: z.string(),
});

/**
 * RegistryWorldEntry represents a world registry entry.
 */
export interface RegistryWorldEntry {
  /**
   * id is the unique ULID of the world.
   */
  id: string;

  /**
   * namespaceId is the IRI of the namespace that owns this world.
   */
  namespaceId: string;

  /**
   * slug is the URL-friendly name.
   */
  slug: string;

  /**
   * label is the human-readable name.
   */
  label: string;
}

/**
 * registryWorldEntrySchema is the Zod schema for RegistryWorldEntry.
 */
export const registryWorldEntrySchema: z.ZodType<RegistryWorldEntry> = z
  .object({
    id: z.string(),
    namespaceId: z.string().url(),
    slug: z.string(),
    label: z.string(),
  });
