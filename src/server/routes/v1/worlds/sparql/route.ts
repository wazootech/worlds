// @deno-types="@types/n3"
import { DataFactory, Writer } from "n3";
import { Router } from "@fartlabs/rt";
import { authorizeRequest } from "#/server/middleware/auth.ts";
import type { AppContext } from "#/server/app-context.ts";
import type { DatasetParams } from "#/server/db/sparql.ts";
import { sparql } from "#/server/db/sparql.ts";
import { isUpdateQuery } from "#/server/sparql/tree-sitter.ts";
import {
  LibsqlPatchHandler,
  LibsqlSearchStoreManager,
} from "#/server/search/libsql.ts";
import { checkRateLimit } from "#/server/middleware/rate-limit.ts";
import type { Patch, PatchHandler } from "@fartlabs/search-store";
import { getPlanPolicy } from "#/server/rate-limit/policies.ts";
import {
  selectWorldByIdWithBlob,
  updateWorld,
} from "#/server/db/resources/worlds/queries.sql.ts";
import { worldTableUpdateSchema } from "#/server/db/resources/worlds/schema.ts";
import { tenantsFind } from "#/server/db/resources/tenants/queries.sql.ts";

const { namedNode, quad } = DataFactory;

/**
 * ParsedQuery parses the query and dataset parameters from the request.
 */
interface ParsedQuery {
  query: string | null;
  datasetParams: DatasetParams;
}

/**
 * parseQuery parses the query and dataset parameters from the request.
 * Supports GET, POST with body or query parameters (per SPARQL spec)
 */
async function parseQuery(
  request: Request,
): Promise<ParsedQuery> {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type") || "";
  const method = request.method;

  // Extract dataset parameters from URL or form data
  const defaultGraphUris: string[] = [];
  const namedGraphUris: string[] = [];

  // Get dataset parameters from URL query string
  url.searchParams.getAll("default-graph-uri").forEach((uri) => {
    defaultGraphUris.push(uri);
  });
  url.searchParams.getAll("named-graph-uri").forEach((uri) => {
    namedGraphUris.push(uri);
  });

  let query: string | null = null;

  if (method === "GET") {
    // GET: query must be in URL parameter
    query = url.searchParams.get("query");
  } else if (method === "POST") {
    // Check query parameter first (valid for POST with application/sparql-query)
    const queryParam = url.searchParams.get("query");
    if (queryParam) {
      query = queryParam;
    } else {
      // Check POST body based on content type
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        query = formData.get("query") as string | null;
        // Also get dataset params from form data
        formData.getAll("default-graph-uri").forEach((uri) => {
          if (typeof uri === "string") {
            defaultGraphUris.push(uri);
          }
        });
        formData.getAll("named-graph-uri").forEach((uri) => {
          if (typeof uri === "string") {
            namedGraphUris.push(uri);
          }
        });
      } else if (contentType.includes("application/sparql-query")) {
        query = await request.text();
      } else if (contentType.includes("application/sparql-update")) {
        query = await request.text();
      }
    }
  }

  return {
    query,
    datasetParams: {
      defaultGraphUris,
      namedGraphUris,
    },
  };
}

/**
 * Helper function to check if query is an update
 * Needed to enforce POST-only for updates and return 204 status
 */

/**
 * Generates SPARQL Service Description in RDF format
 */
function generateServiceDescription(endpointUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ format: "Turtle" });

    // SPARQL Service Description vocabulary
    const sd = "http://www.w3.org/ns/sparql-service-description#";
    const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    const endpoint = namedNode(endpointUrl);
    const serviceType = namedNode(`${sd}Service`);
    const endpointProperty = namedNode(`${sd}endpoint`);

    // Required triples
    writer.addQuad(quad(endpoint, namedNode(`${rdf}type`), serviceType));
    writer.addQuad(quad(endpoint, endpointProperty, endpoint));

    // Advertise supported formats
    const supportedFormat = namedNode(`${sd}supportedFormat`);
    const jsonFormat = namedNode(
      "http://www.w3.org/ns/formats/SPARQL_Results_JSON",
    );
    writer.addQuad(quad(endpoint, supportedFormat, jsonFormat));

    // Advertise supported languages
    const supportedLanguage = namedNode(`${sd}supportedLanguage`);
    const sparql11Query = namedNode(`${sd}SPARQL11Query`);
    const sparql11Update = namedNode(`${sd}SPARQL11Update`);
    writer.addQuad(quad(endpoint, supportedLanguage, sparql11Query));
    writer.addQuad(quad(endpoint, supportedLanguage, sparql11Update));

    writer.end((error, result) => {
      if (error) {
        reject(error);
      } else {
        // If RDF/XML is requested, convert (for now, just return Turtle)
        // Full RDF/XML conversion would require additional library
        resolve(result as string);
      }
    });
  });
}

/**
 * BufferedPatchHandler buffers patches and only applies them when commit is called.
 */
class BufferedPatchHandler implements PatchHandler {
  private patches: Patch[] = [];

  constructor(private readonly handler: PatchHandler) {}

  public patch(patches: Patch[]): Promise<void> {
    this.patches.push(...patches);
    return Promise.resolve();
  }

  public async commit(): Promise<void> {
    if (this.patches.length > 0) {
      await this.handler.patch(this.patches);
    }
  }
}

/**
 * Shared handler for executing SPARQL queries and updates
 */
async function executeSparqlRequest(
  appContext: AppContext,
  request: Request,
  worldId: string,
  tenantId?: string,
  isAdmin?: boolean,
): Promise<Response> {
  const { query } = await parseQuery(request);

  // Rate limit headers to include in response
  let rateLimitHeaders: Record<string, string> = {};

  // If no query, this should only happen for GET - return service description
  if (!query) {
    if (request.method === "GET") {
      const endpointUrl = new URL(request.url).toString();
      const acceptHeader = request.headers.get("accept");
      const serviceDescription = await generateServiceDescription(
        endpointUrl,
      );

      // Determine content type based on Accept header
      const contentType = acceptHeader?.includes("application/rdf+xml")
        ? "application/rdf+xml"
        : "text/turtle";

      return new Response(serviceDescription, {
        headers: { "Content-Type": contentType },
      });
    } else {
      return new Response("Query or update required", { status: 400 });
    }
  }

  // Check if this is an update query
  const isUpdate = await isUpdateQuery(query);

  // Updates are only allowed via POST
  if (isUpdate && request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Apply rate limiting if tenantId is present
  if (tenantId) {
    rateLimitHeaders = await checkRateLimit(appContext, tenantId, worldId, {
      resourceType: isUpdate ? "sparql_update" : "sparql_query",
    });
  }

  // Execute query or update using centralized function
  // Resolve tenantId for the search store (always use the world's owner)
  // Also get the world to use its tenantId for plan policy checks
  const worldResult = await appContext.libsqlClient.execute({
    sql: selectWorldByIdWithBlob,
    args: [worldId],
  });
  const world = worldResult.rows[0];

  let searchTenantId = tenantId;
  if (!searchTenantId) {
    searchTenantId = world?.tenant_id as string | undefined;
  }

  const patchHandlerStart = performance.now();
  const patchHandler = new BufferedPatchHandler(
    searchTenantId
      ? (() => {
        const searchStore = new LibsqlSearchStoreManager({
          client: appContext.libsqlClient,
          embeddings: appContext.embeddings,
        });
        // Create tables asynchronously - don't block on it
        searchStore.createTablesIfNotExists();
        return new LibsqlPatchHandler({
          manager: searchStore,
          tenantId: searchTenantId!,
          worldId,
        });
      })()
      : { patch: async () => {} },
  );
  const patchHandlerTime = performance.now() - patchHandlerStart;
  if (patchHandlerTime > 100) {
    console.log(
      `[PERF] PatchHandler creation: ${patchHandlerTime.toFixed(2)}ms`,
    );
  }

  // Use world.blob directly from worldsResult
  const blob = world?.blob
    ? new Blob([new Uint8Array(world.blob as ArrayBuffer)])
    : new Blob([], { type: "application/n-quads" });

  const sparqlStart = performance.now();
  const { blob: newBlob, result } = await sparql(
    blob,
    query,
    patchHandler,
  );
  const sparqlTime = performance.now() - sparqlStart;
  if (sparqlTime > 1000) {
    console.log(`[PERF] SPARQL execution: ${sparqlTime.toFixed(2)}ms`);
  }

  // For updates, return 204 instead of the stream response
  if (isUpdate) {
    const newData = new Uint8Array(await newBlob.arrayBuffer());

    // Check world size limits (bypass for admin API keys)
    if (!isAdmin) {
      // If tenantId is not provided (e.g., using admin API), use the world's owner
      const effectiveTenantId = tenantId ??
        world?.tenant_id as string | undefined;

      let tenantPlan: string | null = null;
      if (effectiveTenantId) {
        const tenantResult = await appContext.libsqlClient.execute({
          sql: tenantsFind,
          args: [effectiveTenantId],
        });
        const tenant = tenantResult.rows[0];
        tenantPlan = tenant?.plan as string | null ?? null;
      }

      const planPolicy = getPlanPolicy(tenantPlan);
      if (newData.length > planPolicy.worldLimits.maxWorldSize) {
        return new Response("World size limit exceeded", { status: 413 });
      }
    }

    // Commit patches to search index
    const commitStart = performance.now();
    await patchHandler.commit();
    const commitTime = performance.now() - commitStart;
    if (commitTime > 1000) {
      console.log(`[PERF] Search index commit: ${commitTime.toFixed(2)}ms`);
    }

    // Persist new blob. Since the world metadata row exists, we just update it.
    const worldUpdate = worldTableUpdateSchema.parse({
      label: world?.label as string | undefined,
      description: world?.description as string | null | undefined,
      updated_at: Date.now(),
      blob: newData,
    });

    await appContext.libsqlClient.execute({
      sql: updateWorld,
      args: [
        worldUpdate.label ?? world?.label ?? null,
        worldUpdate.description ?? world?.description ?? null,
        worldUpdate.updated_at ?? Date.now(),
        worldUpdate.blob ?? newData,
        worldId,
      ],
    });

    return new Response(null, {
      status: 204,
      headers: rateLimitHeaders,
    });
  }

  // For queries, return the stream response
  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/sparql-results+json",
      ...rateLimitHeaders,
    },
  });
}

export default (appContext: AppContext) => {
  return new Router()
    .get(
      "/v1/worlds/:world/sparql",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return new Response("World not found", { status: 404 });
        }

        const worldResult = await appContext.libsqlClient.execute({
          sql: selectWorldByIdWithBlob,
          args: [worldId],
        });
        const world = worldResult.rows[0];

        if (
          !world || world.deleted_at != null ||
          (world.tenant_id !== authorized.tenant?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        try {
          return await executeSparqlRequest(
            appContext,
            ctx.request,
            worldId,
            authorized.tenant?.id,
            authorized.admin,
          );
        } catch (error) {
          console.error("SPARQL query error:", error);
          return Response.json(
            {
              error: error instanceof Error ? error.message : "Query failed",
            },
            { status: 400 },
          );
        }
      },
    )
    .post(
      "/v1/worlds/:world/sparql",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return new Response("World ID required", { status: 400 });
        }

        const authorized = await authorizeRequest(appContext, ctx.request);
        if (!authorized.tenant && !authorized.admin) {
          return new Response("World not found", { status: 404 });
        }

        const worldResult = await appContext.libsqlClient.execute({
          sql: selectWorldByIdWithBlob,
          args: [worldId],
        });
        const world = worldResult.rows[0];

        if (
          !world || world.deleted_at != null ||
          (world.tenant_id !== authorized.tenant?.id &&
            !authorized.admin)
        ) {
          return new Response("World not found", { status: 404 });
        }

        // Check for unsupported content types
        const contentType = ctx.request.headers.get("content-type") || "";
        if (
          contentType &&
          !contentType.includes("application/x-www-form-urlencoded") &&
          !contentType.includes("application/sparql-query") &&
          !contentType.includes("application/sparql-update") &&
          !contentType.includes("text/plain")
        ) {
          return new Response("Unsupported Media Type", { status: 415 });
        }

        try {
          return await executeSparqlRequest(
            appContext,
            ctx.request,
            worldId,
            authorized.tenant?.id,
            authorized.admin,
          );
        } catch (error) {
          console.error("SPARQL query/update error:", error);
          return Response.json(
            {
              error: error instanceof Error
                ? error.message
                : "Query/update failed",
            },
            { status: 400 },
          );
        }
      },
    )
    // Handle unsupported methods (PUT, DELETE, etc.) via PUT and DELETE routes
    .put(
      "/v1/worlds/:world/sparql",
      () => {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { "Allow": "GET, POST" },
        });
      },
    )
    .delete(
      "/v1/worlds/:world/sparql",
      () => {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { "Allow": "GET, POST" },
        });
      },
    );
};
