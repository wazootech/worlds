import type { components } from "../api/v1/types.generated.ts";

/**
 * WorldId is an alias for a string.
 */
export type WorldId = string;

/**
 * World is the interface for a World resource.
 * We rely on the generated TypeScript interface from OpenAPI for the object structure.
 */
export type World = components["schemas"]["World"];
