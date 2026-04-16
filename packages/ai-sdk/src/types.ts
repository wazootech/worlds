import type { z } from "zod";
import type { WorldsInterface, WorldsSource } from "@wazoo/worlds-sdk";

/**
 * SourceInput is a flexible way to specify a data source.
 * It can be a string (ID or world) for read-only access, or a Source object for granular control.
 */
export type SourceInput = string | WorldsSource;

/**
 * WorldsTool defines the metadata and schema for a Worlds tool.
 */
export interface WorldsTool<TInput = unknown, TOutput = unknown> {
  /**
   * name is the unique identifier for the tool.
   */
  name: string;

  /**
   * description is a clear, zero-fluff summary of the tool's purpose.
   */
  description: string;

  /**
   * inputSchema is the Zod schema for the tool's arguments.
   */
  inputSchema: z.ZodType<TInput>;

  /**
   * outputSchema is the Zod schema for the tool's response.
   */
  outputSchema: z.ZodType<TOutput>;

  /**
   * isWrite indicates if the tool can modify state or data.
   */
  isWrite: boolean;
}

/**
 * CreateToolsOptions are the configuration options for tool creation.
 */
export interface CreateToolsOptions {
  /**
   * worlds is the Worlds interface to use for the tools.
   */
  worlds: WorldsInterface;

  /**
   * sources is the list of sources visible to the tools.
   */
  sources: SourceInput[];
}
