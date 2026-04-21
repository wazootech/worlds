import { z } from "../shared/z.ts";

/**
 * WorldId is a branded string for World identifiers.
 */
export const worldIdSchema = z.id("World");
export type WorldId = z.infer<typeof worldIdSchema>;

/**
 * World represents a world in the Worlds API.
 * Resource name format: namespaces/{namespace}/worlds/{identifier}
 */
export const worldSchema = z.object({
  /**
   * name is the full canonical resource name: namespaces/{namespace}/worlds/{identifier}.
   */
  name: z.string().optional().describe(
    "@OutputOnly The canonical resource name.",
  ),

  /**
   * id is the unique identifier for the world.
   */
  id: worldIdSchema.optional().describe(
    "@Identifier @Immutable The world identifier.",
  ),

  /**
   * namespace is the optional parent namespace.
   */
  namespace: z.string().optional().describe(
    "@Immutable The namespace (optional).",
  ),

  /**
   * displayName is the human-readable name of the world.
   */
  displayName: z.displayName(),

  /**
   * description is an optional human-readable description of the world.
   */
  description: z.string().optional().describe("The description."),

  /**
   * createTime is the millisecond timestamp of creation.
   */
  createTime: z.createTime(),

  /**
   * updateTime is the millisecond timestamp of the last update.
   */
  updateTime: z.updateTime(),

  /**
   * deleteTime is the millisecond timestamp of deletion, if applicable.
   */
  deleteTime: z.deleteTime(),
});

/**
 * World represents a world in the Worlds API.
 */
export type World = z.infer<typeof worldSchema>;
