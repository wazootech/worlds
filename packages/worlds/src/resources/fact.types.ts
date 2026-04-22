import type { components } from "../api/v1/types.generated.ts";

/**
 * FactId is an alias for a string.
 */
export type FactId = string;

/**
 * FactTable is the interface for a Fact resource.
 * We rely on the generated TypeScript interface from OpenAPI.
 */
export type FactTable = components["schemas"]["Fact"];

/**
 * FactTableUpsert represents the data needed to upsert a fact.
 */
export type FactTableUpsert = Omit<FactTable, "created_at" | "deleted_at">;
