import { z } from "zod";

export const rateLimitSchema = z.object({
  key: z.string(),
  tokens: z.number(),
  last_refill: z.number(),
});

export type RateLimit = z.infer<typeof rateLimitSchema>;
