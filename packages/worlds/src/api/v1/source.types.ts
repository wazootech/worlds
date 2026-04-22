import type { components } from "./types.generated.ts";

/**
 * TransactionMode is imported from the common types.
 */
import type { TransactionMode } from "./common.types.ts";

/**
 * WorldSource describes a world resource by ID or name.
 */
export type WorldSource = components["schemas"]["Source"];

/**
 * Source is a union of all ways to identify a world source.
 */
export type Source = string | WorldSource;

/**
 * BaseSource is an empty object representing the default source.
 */
export type BaseSource = {
  mode?: TransactionMode;
};

/**
 * NamedSource identifies a world by its canonical resource name.
 */
export type NamedSource = {
  name: string;
  mode?: TransactionMode;
};

/**
 * QualifiedSource identifies a world by namespace and ID.
 */
export type QualifiedSource = {
  namespace?: string;
  id?: string;
  mode?: TransactionMode;
};

/**
 * FullyQualifiedSource is a source with guaranteed namespace and ID.
 */
export type FullyQualifiedSource = {
  namespace: string;
  id: string;
  mode: TransactionMode;
};
