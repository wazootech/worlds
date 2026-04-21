import { z as zod } from "zod";

/**
 * z is a central wrapper for Zod that defines project-wide schema patterns.
 * This ensures consistency across Resources and RPC Transport messages.
 */
export const z = {
  // We spread the zod object to include all its runtime helpers (string, object, etc.)
  ...zod,

  /**
   * url defines a standard URL-validated string.
   */
  url: () => zod.string().url().describe("@Format('url')"),

  /**
   * id defines a standard resource identifier.
   */
  id: <T extends string>(brand: T) => zod.string().brand<T>().describe("@Identifier"),

  /**
   * createTime defines a standard @OutputOnly creation timestamp.
   */
  createTime: () => zod.number().describe("@OutputOnly The creation timestamp."),

  /**
   * updateTime defines a standard @OutputOnly update timestamp.
   */
  updateTime: () => zod.number().describe("@OutputOnly The last update timestamp."),

  /**
   * deleteTime defines a standard @OutputOnly deletion timestamp.
   */
  deleteTime: () => zod.number().optional().describe("@OutputOnly The deletion timestamp."),

  /**
   * displayName defines a standard human-readable label.
   */
  displayName: () => zod.string().optional().describe("The human-readable name."),
};