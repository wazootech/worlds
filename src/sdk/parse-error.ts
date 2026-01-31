import { z } from "zod";

const errorSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
}).transform((data) => data.error.message);

/**
 * parseError parses an error response from the API.
 */
export async function parseError(response: Response): Promise<string> {
  let errorMessage = `${response.status} ${response.statusText}`;
  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = await response.json();
      const result = errorSchema.safeParse(json);
      if (result.success) {
        errorMessage = result.data;
      }
    } else {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }
  } catch {
    // Ignore parsing errors and return the default status text
  }
  return errorMessage;
}
