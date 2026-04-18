import { type WorldsContext, worldsListInputSchema } from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * handleListWorlds paginates all available worlds.
 */
export async function handleListWorlds(
  appContext: WorldsContext,
  request: Request,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const parseResult = worldsListInputSchema.safeParse(body);
  if (!parseResult.success) {
    return ErrorResponse.BadRequest(
      `Invalid parameters: ${parseResult.error.message}`,
    );
  }

  const input = parseResult.data;
  const targetNs = input.namespace ?? authorized.namespaceId ?? "_";

  const denied = assertNamespacePathAllowed(authorized, targetNs);
  if (denied) return denied;

  const engine = appContext.engine;
  if (!engine) {
    return ErrorResponse.InternalServerError("Engine not initialized");
  }

  const worlds = await engine.list({
    ...input,
    namespace: targetNs,
  });

  return Response.json(worlds);
}
