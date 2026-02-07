import { z } from "zod";

/**
 * Invite represents an invite in the Worlds API.
 */
export interface Invite {
  code: string;
  createdAt: number;
  redeemedBy: string | null;
  redeemedAt: number | null;
}

/**
 * inviteSchema is the Zod schema for Invite.
 */
export const inviteSchema: z.ZodType<Invite> = z.object({
  code: z.string(),
  createdAt: z.number(),
  redeemedBy: z.string().nullable(),
  redeemedAt: z.number().nullable(),
});

/**
 * CreateInviteParams represents the parameters for creating an invite.
 */
export interface CreateInviteParams {
  code?: string;
}

/**
 * createInviteParamsSchema is the Zod schema for CreateInviteParams.
 */
export const createInviteParamsSchema: z.ZodType<CreateInviteParams> = z.object(
  {
    code: z.string().optional(),
  },
);
