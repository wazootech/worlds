import { eTag, ifNoneMatch } from "@std/http/etag";
import { STATUS_CODE } from "@std/http/status";

/**
 * handleETagRequest checks the If-None-Match header and returns a 304 response if it matches the ETag of the body.
 * Otherwise, it returns the original response with the ETag header set.
 */
export async function handleETagRequest(
  request: Request,
  response: Response,
): Promise<Response> {
  // Only handle 200 OK responses with a body.
  // We can't easily handle streams here without consuming them,
  // so we check if it's a "simple" response.
  if (response.status !== STATUS_CODE.OK || !response.body) {
    return response;
  }

  // Clone the response to read the body for ETag calculation.
  // Be careful with large bodies; for worlds-api, metadata and exports are usually reasonably sized.
  const clonedResponse = response.clone();
  const body = await clonedResponse.arrayBuffer();
  const etag = await eTag(new Uint8Array(body));

  const ifNoneMatchHeader = request.headers.get("if-none-match");
  if (ifNoneMatchHeader && !ifNoneMatch(ifNoneMatchHeader, etag)) {
    return new Response(null, {
      status: STATUS_CODE.NotModified,
      headers: {
        "etag": etag,
        ...Object.fromEntries(response.headers.entries()),
      },
    });
  }

  response.headers.set("etag", etag);
  return response;
}
