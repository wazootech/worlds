import {
  expandPathNamespace,
  resolveSource,
  type WorldsContext,
  worldsUpdateInputSchema,
} from "@wazoo/worlds-sdk";
import { authorizeRequest } from "#/middleware/auth.ts";
import { ErrorResponse } from "#/utils/errors/errors.ts";
import { getNamespacedEngine } from "#/utils/engine.ts";
import { assertNamespacePathAllowed } from "#/utils/namespace-access.ts";

/**
 * handlePutWorld modifies an existing world.
 */
export async function handlePutWorld(
  appContext: WorldsContext,
  request: Request,
): Promise<Response> {
  const authorized = await authorizeRequest(appContext, request);
  if (!authorized.admin && !authorized.namespaceId) {
    return ErrorResponse.Unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const parseResult = worldsUpdateInputSchema.safeParse(body);
  if (!parseResult.success) {
    return ErrorResponse.BadRequest(
      `Invalid parameters: ${parseResult.error.message}`,
    );
  }

  const input = parseResult.data;
  const source = resolveSource(input.source, {
    namespace: authorized.namespaceId ?? undefined,
  });
  const effectiveNs = expandPathNamespace(
    source.namespace ?? null,
    authorized.namespaceId,
  );

  const denied = assertNamespacePathAllowed(authorized, effectiveNs ?? "_");
  if (denied) return denied;

  const engine = getNamespacedEngine(appContext, effectiveNs);
  await engine.update(input);
  return new Response(null, { status: 204 });
}
