import { expandGlob } from "@std/fs/expand-glob";
import { toFileUrl } from "@std/path/to-file-url";
import { bearerAuth } from "hono/bearer-auth";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { DenoKvOxigraphService } from "#/oxigraph/deno-kv-oxigraph-service.ts";
import { withOxigraphService } from "#/oxigraph/oxigraph-middleware.ts";

export const app = new OpenAPIHono();

// Initialize Oxigraph service.

const kv = await Deno.openKv(":memory:");
const service = new DenoKvOxigraphService(kv);

app.use("*", withOxigraphService(service));

// Initialize API security.

app.use(
  "/v1/*",
  bearerAuth({
    verifyToken(token, _ctx) {
      return token === (Deno.env.get("API_KEY") ?? "test-token");
    },
  }),
);

app.openAPIRegistry.registerComponent(
  "securitySchemes",
  "Bearer",
  {
    type: "http",
    scheme: "bearer",
  },
);

// Register the v1 API routes.

for await (
  const entry of expandGlob("**/route.ts", { root: "./src/v1/routes" })
) {
  const module = await import(toFileUrl(entry.path).href);
  if (!(module.app instanceof OpenAPIHono)) {
    continue;
  }

  app.route("/", module.app);
}

// Generate the OpenAPI documentation.

export const openapiConfig = {
  openapi: "3.0.1",
  info: {
    version: "0.0.1",
    title: "Worlds API",
    description:
      "Worlds API™ is a REST API that can be used to manage, query, update, and reason over SPARQL 1.1-compatible stores at the edge.",
    contact: {
      url: "https://github.com/FartLabs/worlds-api/issues",
    },
  },
};

app.doc("/doc", openapiConfig);

// Generate the Scalar API reference.

app.get("/scalar", Scalar({ url: "/doc" }));

export default app satisfies Deno.ServeDefaultExport;
