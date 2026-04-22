import type { components } from "./types.generated.ts";
import type { World } from "../../resources/world.types.ts";
import type { ContentType } from "./common.types.ts";
import type { Source } from "./source.types.ts";

/**
 * GetWorldRequest represents the parameters for retrieving a single world.
 */
export type GetWorldRequest = components["schemas"]["GetWorldRequest"];

/**
 * CreateWorldRequest represents the parameters for creating a new world.
 */
export type CreateWorldRequest = components["schemas"]["CreateWorldRequest"] & {
  /** name is a legacy alias for id. */
  name?: string;
  /** world is a legacy alias for id. */
  world?: string;
};

/**
 * UpdateWorldRequest represents the parameters for updating a world.
 */
export type UpdateWorldRequest = components["schemas"]["UpdateWorldRequest"];

/**
 * DeleteWorldRequest represents the parameters for deleting a world.
 */
export type DeleteWorldRequest = components["schemas"]["DeleteWorldRequest"];

/**
 * ListWorldsRequest represents the parameters for listing worlds.
 */
export type ListWorldsRequest = components["schemas"]["ListWorldsRequest"];

/**
 * ListWorldsResponse represents the results of listing worlds.
 */
export type ListWorldsResponse = components["schemas"]["ListWorldsResponse"];

/**
 * ImportWorldRequest represents the parameters for importing data into a world.
 */
export type ImportWorldRequest = components["schemas"]["ImportWorldRequest"] & {
  /** Engine-compatible data type override. */
  data: string | ArrayBuffer;
};

/**
 * ExportWorldRequest represents the parameters for exporting data from a world.
 */
export type ExportWorldRequest = components["schemas"]["ExportWorldRequest"];

/**
 * QueryWorldRequest represents the parameters for executing a query against a world.
 */
export type QueryWorldRequest = {
  source: Source;
  query: string;
};

/**
 * GetServiceDescriptionRequest represents a request for server metadata.
 */
export type GetServiceDescriptionRequest = {
  sources?: Source[];
  contentType?: ContentType;
};
