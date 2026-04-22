import type { components } from "./types.generated.ts";

/**
 * ContentType defines the supported media types for world data.
 */
export type ContentType = components["schemas"]["ContentType"];

/**
 * TransactionMode defines the supported transaction behaviors.
 */
export type TransactionMode = components["schemas"]["TransactionMode"];

/**
 * ErrorResponseData represents the standard error format.
 */
export type ErrorResponseData = components["schemas"]["ErrorResponseData"];
