// @deno-types="@types/n3"
import { DataFactory, Writer } from "n3";
import { STATUS_CODE } from "@std/http/status";
import { Router } from "@fartlabs/rt";
import { ulid } from "@std/ulid/ulid";
import { type AuthorizedRequest, authorizeRequest } from "#/middleware/auth.ts";
import { negotiateSerialization } from "#/lib/rdf/serialization.ts";
import type { ServerContext } from "#/context.ts";
import type { DatasetParams } from "#/lib/blob/sparql.ts";
import { sparql } from "#/lib/blob/sparql.ts";
import { executeSparqlOutputSchema, isSparqlUpdate } from "@wazoo/sdk";
import {
  BufferedPatchHandler,
  handlePatch,
} from "#/lib/rdf-patch/rdf-patch.ts";
import type { Patch } from "#/lib/rdf-patch/rdf-patch.ts";
import { WorldsService } from "#/lib/database/tables/worlds/service.ts";
import { worldTableUpdateSchema } from "#/lib/database/tables/worlds/schema.ts";
import { ErrorResponse } from "#/lib/errors/errors.ts";
import { LogsService } from "#/lib/database/tables/logs/service.ts";
import { BlobsService } from "#/lib/database/tables/blobs/service.ts";

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
 * Generates SPARQL Service Description in RDF format.
 * Includes support for SPARQL 1.1 and 1.2 (RDF-star) features.
 */
function generateServiceDescription(
  endpointUrl: string,
  format: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ format });

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
    const turtleFormat = namedNode(
      "http://www.w3.org/ns/formats/Turtle",
    );
    writer.addQuad(quad(endpoint, supportedFormat, jsonFormat));
    writer.addQuad(quad(endpoint, supportedFormat, turtleFormat));

    // Advertise supported languages
    const supportedLanguage = namedNode(`${sd}supportedLanguage`);
    const sparql11Query = namedNode(`${sd}SPARQL11Query`);
    const sparql11Update = namedNode(`${sd}SPARQL11Update`);
    const sparql12Query = namedNode(`${sd}SPARQL12Query`);
    const sparql12Update = namedNode(`${sd}SPARQL12Update`);
    writer.addQuad(quad(endpoint, supportedLanguage, sparql11Query));
    writer.addQuad(quad(endpoint, supportedLanguage, sparql11Update));
    writer.addQuad(quad(endpoint, supportedLanguage, sparql12Query));
    writer.addQuad(quad(endpoint, supportedLanguage, sparql12Update));

    // Advertise features (including future-proof ones)
    const feature = namedNode(`${sd}feature`);
    const unionDefaultGraph = namedNode(`${sd}UnionDefaultGraph`);
    const dereferencesURIs = namedNode(`${sd}DereferencesURIs`);
    const tripleTerms = namedNode(
      "http://www.w3.org/ns/sparql-service-description#TripleTerms",
    );
    writer.addQuad(quad(endpoint, feature, unionDefaultGraph));
    writer.addQuad(quad(endpoint, feature, dereferencesURIs));
    writer.addQuad(quad(endpoint, feature, tripleTerms));

    writer.end((error: Error | null, result: string | undefined) => {
      if (error) {
        reject(error);
      } else {
        resolve(result as string);
      }
    });
  });
}

/**
 * Shared handler for executing SPARQL queries and updates
 */
async function executeSparqlRequest(
  appContext: ServerContext,
  request: Request,
  worldId: string,
  authorized: AuthorizedRequest,
): Promise<Response> {
  const { query } = await parseQuery(request);

  // If no query, this should only happen for GET - return service description
  if (!query) {
    if (request.method === "GET") {
      const endpointUrl = new URL(request.url).toString();
      const serialization = negotiateSerialization(request);

      const serviceDescription = await generateServiceDescription(
        endpointUrl,
        serialization.format,
      );

      return new Response(serviceDescription, {
        headers: { "Content-Type": serialization.contentType },
      });
    } else {
      return ErrorResponse.BadRequest("Query or update required");
    }
  }

  const isUpdate = await isSparqlUpdate(query);

  // Updates are only allowed via POST
  if (isUpdate && request.method !== "POST") {
    return ErrorResponse.MethodNotAllowed();
  }

  // Execute query or update using centralized function
  const worldsService = new WorldsService(appContext.libsql.database);
  const world = await worldsService.getById(worldId);

  if (!world || world.deleted_at != null) {
    return ErrorResponse.NotFound("World not found");
  }

  if (!authorized.admin) {
    return ErrorResponse.Forbidden();
  }

  // Get the world-specific client using DatabaseManager
  // This ensures we are connected to the correct database for this world
  let managedWorld;
  if (appContext.libsql.manager) {
    try {
      managedWorld = await appContext.libsql.manager.get(worldId);
    } catch (error) {
      console.error(`Failed to get client for world ${worldId}:`, error);
    }
  }

  const patchHandlerStart = performance.now();
  const patchHandler = new BufferedPatchHandler(
    managedWorld
      ? {
        patch: (patches: Patch[]) =>
          handlePatch(managedWorld.database, appContext.embeddings, patches),
      }
      : { patch: async () => {} },
  );
  const patchHandlerTime = performance.now() - patchHandlerStart;
  if (patchHandlerTime > 100) {
    console.log(
      `[PERF] PatchHandler creation: ${patchHandlerTime.toFixed(2)}ms`,
    );
  }

  if (!managedWorld) {
    return ErrorResponse.InternalServerError("World database not found");
  }

  // Get the blob from BlobsService
  const blobsService = new BlobsService(managedWorld.database);
  const worldData = await blobsService.get();
  const blobData = worldData?.blob as unknown as ArrayBuffer;
  const blob = blobData
    ? new Blob([new Uint8Array(blobData)])
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

    // Commit patches to search index
    const commitStart = performance.now();
    await patchHandler.commit();
    const commitTime = performance.now() - commitStart;
    if (commitTime > 1000) {
      console.log(`[PERF] Search index commit: ${commitTime.toFixed(2)}ms`);
    }

    // Persist new blob via BlobsService
    const updatedAt = Date.now();
    await blobsService.set(newData, updatedAt);

    // Update world metadata (labels etc)
    const worldUpdate = worldTableUpdateSchema.parse({
      label: world?.label,
      description: world?.description,
      updated_at: updatedAt,
    });

    await worldsService.update(worldId, {
      label: worldUpdate.label ?? undefined,
      description: worldUpdate.description ?? undefined,
      updated_at: worldUpdate.updated_at,
      db_hostname: world?.db_hostname ?? undefined,
      db_token: world?.db_token ?? undefined,
      deleted_at: world?.deleted_at ?? undefined,
    });

    const managed = await appContext.libsql.manager.get(worldId);
    const logsService = new LogsService(managed.database);
    await logsService.add({
      id: ulid(),
      world_id: worldId,
      timestamp: Date.now(),
      level: "info",
      message: "SPARQL update",
      metadata: {
        query: query.slice(0, 1000), // Safety truncation
      },
    });

    return new Response(null, {
      status: STATUS_CODE.NoContent,
    });
  }

  const managed = await appContext.libsql.manager.get(worldId);
  const logsService = new LogsService(managed.database);
  await logsService.add({
    id: ulid(),
    world_id: worldId,
    timestamp: Date.now(),
    level: "info",
    message: "SPARQL query",
    metadata: {
      query: query.slice(0, 1000), // Safety truncation
    },
  });

  // For queries, return the result response
  const validatedResult = executeSparqlOutputSchema.parse(result);
  return Response.json(validatedResult, {
    headers: {
      "Content-Type": "application/sparql-results+json",
    },
  });
}

export default (appContext: ServerContext) => {
  return new Router()
    .get(
      "/v1/worlds/:world/sparql",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const worldsService = new WorldsService(appContext.libsql.database);
        const world = await worldsService.getById(worldId);

        if (!world || world.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
        }

        try {
          return await executeSparqlRequest(
            appContext,
            ctx.request,
            worldId,
            authorized,
          );
        } catch (error) {
          console.error("SPARQL query error:", error);
          return ErrorResponse.BadRequest(
            error instanceof Error ? error.message : "Query failed",
          );
        }
      },
    )
    .post(
      "/v1/worlds/:world/sparql",
      async (ctx) => {
        const worldId = ctx.params?.pathname.groups.world;
        if (!worldId) {
          return ErrorResponse.BadRequest("World ID required");
        }

        const authorized = authorizeRequest(appContext, ctx.request);
        if (!authorized.admin) {
          return ErrorResponse.Unauthorized();
        }

        const worldsService = new WorldsService(appContext.libsql.database);
        const world = await worldsService.getById(worldId);

        if (!world || world.deleted_at != null) {
          return ErrorResponse.NotFound("World not found");
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
          return ErrorResponse.UnsupportedMediaType();
        }

        try {
          return await executeSparqlRequest(
            appContext,
            ctx.request,
            worldId,
            authorized,
          );
        } catch (error) {
          console.error("SPARQL query/update error:", error);
          return ErrorResponse.BadRequest(
            error instanceof Error ? error.message : "Query/update failed",
          );
        }
      },
    )
    // Handle unsupported methods (PUT, DELETE, etc.) via PUT and DELETE routes
    .put(
      "/v1/worlds/:world/sparql",
      () => {
        return ErrorResponse.MethodNotAllowed("Method Not Allowed", {
          "Allow": "GET, POST",
        });
      },
    )
    .delete(
      "/v1/worlds/:world/sparql",
      () => {
        return ErrorResponse.MethodNotAllowed("Method Not Allowed", {
          "Allow": "GET, POST",
        });
      },
    );
};
