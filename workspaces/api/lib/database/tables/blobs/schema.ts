import { z } from "zod";

/**
 * BlobRow represents the singleton blob record.
 */
export interface BlobRow {
  blob: Uint8Array | null;
  updated_at: number;
}

/**
 * blobSchema represents the singleton blob record.
 */
const blobShape = z.object({
  blob: z
    .union([
      z.instanceof(Uint8Array),
      z.instanceof(ArrayBuffer).transform((ab) => new Uint8Array(ab)),
    ])
    .nullable(),
  updated_at: z.number(),
});

export const blobSchema: z.ZodType<BlobRow> = blobShape;
