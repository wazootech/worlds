import { z } from "zod";

/**
 * KernelNamespace represents a namespace in the kernel.
 */
export interface KernelNamespace {
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
 * kernelNamespaceSchema is the Zod schema for KernelNamespace.
 */
export const kernelNamespaceSchema: z.ZodType<KernelNamespace> = z.object({
  id: z.string().url(),
  slug: z.string(),
  label: z.string(),
});

/**
 * KernelApiKey represents an API key in the kernel.
 */
export interface KernelApiKey {
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
 * kernelApiKeySchema is the Zod schema for KernelApiKey.
 */
export const kernelApiKeySchema: z.ZodType<KernelApiKey> = z.object({
  id: z.string().url(),
  namespaceId: z.string().url(),
  secret: z.string(),
});

/**
 * KernelWorldRegistry represents a world registry entry in the kernel.
 */
export interface KernelWorldRegistry {
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
 * kernelWorldRegistrySchema is the Zod schema for KernelWorldRegistry.
 */
export const kernelWorldRegistrySchema: z.ZodType<KernelWorldRegistry> = z
  .object({
    id: z.string(),
    namespaceId: z.string().url(),
    slug: z.string(),
    label: z.string(),
  });
