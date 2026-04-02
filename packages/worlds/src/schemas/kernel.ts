import { z } from "zod";

/**
 * kernelOrganizationSchema is the Zod schema for a kernel organization.
 */
export const kernelOrganizationSchema: z.ZodObject<{
  id: z.ZodString;
  slug: z.ZodString;
  label: z.ZodString;
}> = z.object({
  /**
   * id is the unique IRI of the organization.
   */
  id: z.string().url(),

  /**
   * slug is the URL-friendly name.
   */
  slug: z.string(),

  /**
   * label is the human-readable name.
   */
  label: z.string(),
});

/**
 * KernelOrganization is the type for a kernel organization.
 */
export type KernelOrganization = z.infer<typeof kernelOrganizationSchema>;

/**
 * kernelApiKeySchema is the Zod schema for a kernel API key.
 */
export const kernelApiKeySchema: z.ZodObject<{
  id: z.ZodString;
  orgId: z.ZodString;
  secret: z.ZodString;
}> = z.object({
  /**
   * id is the unique IRI of the key.
   */
  id: z.string().url(),

  /**
   * orgId is the IRI of the organization this key belongs to.
   */
  orgId: z.string().url(),

  /**
   * secret is the raw Bearer token value.
   */
  secret: z.string(),
});

/**
 * KernelApiKey is the type for a kernel API key.
 */
export type KernelApiKey = z.infer<typeof kernelApiKeySchema>;

/**
 * kernelWorldRegistrySchema is the Zod schema for a kernel world registry entry.
 */
export const kernelWorldRegistrySchema: z.ZodObject<{
  id: z.ZodString;
  orgId: z.ZodString;
  slug: z.ZodString;
  label: z.ZodString;
}> = z.object({
  /**
   * id is the unique ULID of the world.
   */
  id: z.string(),

  /**
   * orgId is the IRI of the organization that owns this world.
   */
  orgId: z.string().url(),

  /**
   * slug is the URL-friendly name.
   */
  slug: z.string(),

  /**
   * label is the human-readable name.
   */
  label: z.string(),
});

/**
 * KernelWorldRegistry is the type for a kernel world registry entry.
 */
export type KernelWorldRegistry = z.infer<typeof kernelWorldRegistrySchema>;
