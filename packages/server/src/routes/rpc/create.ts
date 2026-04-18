import { type WorldsContext, worldsCreateInputSchema } from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";

/**
 * handleCreateWorld registers a new world.
 */
export async function handleCreateWorld(
  appContext: WorldsContext,
  request: Request,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, request);
  if (!authorized.admin) {
    return ErrorResponse.Unauthorized("Admin access required to create worlds");
  }

  const body = await request.json().catch(() => ({}));
  const parseResult = worldsCreateInputSchema.safeParse(body);
  if (!parseResult.success) {
    return ErrorResponse.BadRequest(
      `Invalid parameters: ${parseResult.error.message}`,
    );
  }

  const engine = appContext.engine;
  if (!engine) {
    return ErrorResponse.InternalServerError("Engine not initialized");
  }

  const world = await engine.create(parseResult.data);
  return Response.json(world, { status: 201 });
}
