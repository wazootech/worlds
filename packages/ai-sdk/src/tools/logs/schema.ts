import { z } from "zod";
import { type Log, logSchema } from "@wazoo/worlds-sdk";

export { worldsLogsInputSchema } from "@wazoo/worlds-sdk";
export type { WorldsLogsInput } from "@wazoo/worlds-sdk";

/** WorldsLogsOutput is the output for retrieving logs in the AI SDK. */
export interface WorldsLogsOutput {
  logs: Log[];
}

/** worldsLogsOutputSchema is the Zod schema for log retrieval output. */
export const worldsLogsOutputSchema: z.ZodType<WorldsLogsOutput> = z.object({
  logs: z.array(logSchema),
});
