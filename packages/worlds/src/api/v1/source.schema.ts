import { z } from "../../shared/z.ts";
import {
  type TransactionMode,
  transactionModeSchema,
} from "./common.schema.ts";

/**
 * BaseSource contains common properties for all object-based world sources.
 */
export interface BaseSource {
  /**
   * mode indicates the transaction behavior for the source access.
   */
  mode?: TransactionMode;
}

/**
 * NamedSource identifies a world by a single name string in an object.
 */
export interface NamedSource extends BaseSource {
  /**
   * name is the source identifier (e.g. "world" or "namespace/world").
   */
  name: string;
}

/**
 * IdSource identifies a world using its unique identifier.
 */
export interface IdSource extends BaseSource {
  /**
   * id is the world identifier.
   */
  id: string;
}

/**
 * NamespaceSource identifies a target namespace.
 */
export interface NamespaceSource extends BaseSource {
  /**
   * namespace is the namespace identifier.
   */
  namespace: string;
}

/**
 * FullyQualifiedSource identifies a world by both namespace and id.
 */
export interface FullyQualifiedSource extends BaseSource {
  /**
   * namespace is the namespace identifier.
   */
  namespace: string;
 
  /**
   * id is the world identifier.
   */
  id: string;
}

/**
 * QualifiedSource represents any explicitly qualified target (id and/or namespace).
 */
export type QualifiedSource =
  | IdSource
  | NamespaceSource
  | FullyQualifiedSource;

/**
 * SourceObject is a union of object-based world identifiers.
 */
export type SourceObject =
  | BaseSource
  | NamedSource
  | QualifiedSource;

/**
 * Source represents a target world by identifier.
 */
export type Source =
  | string // "namespace/world" or "world"
  | SourceObject;

/**
 * sourceSchema is the Zod schema for Source.
 */
export const sourceSchema = z.union([
  z.string().describe(
    "A source name: 'world' or 'namespace/world'. Falls back to WORLDS_ID and WORLDS_NS environment variables if omitted via object forms.",
  ),
  z.intersection(
    z.object({
      mode: transactionModeSchema.optional().describe(
        "The transaction mode (write, read, or deferred).",
      ),
    }),
    z.union([
      z.object({
        name: z.string().describe(
          "A source name: 'world' or 'namespace/id'. Falls back to WORLDS_ID and WORLDS_NS environment variables if empty.",
        ),
      }),
      z.object({
        id: z.string().describe("A world identifier. Falls back to WORLDS_ID."),
        namespace: z.string().optional().describe(
          "A namespace identifier. Falls back to WORLDS_NS.",
        ),
      }),
      z.object({
        namespace: z.string().describe(
          "A namespace identifier. Falls back to WORLDS_NS.",
        ),
        id: z.string().optional().describe(
          "A world identifier. Falls back to WORLDS_ID.",
        ),
      }),
      z.object({}).describe("Default Source (all identifiers omitted)"),
    ]),
  ),
]);
