import { expandGlob } from "@std/fs/expand-glob";
import { toFileUrl } from "@std/path/to-file-url";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

const app = new OpenAPIHono();

// Register the API routes for v1.
for await (
  const entry of expandGlob("**/*.ts", { root: "./src/api/v1" })
) {
  const module = await import(toFileUrl(entry.path).href);
  if (!(module.app instanceof OpenAPIHono)) {
    continue;
  }

  app.route("/v1", module.app);
}

// Generate the OpenAPI documentation.
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "0.0.1",
    title: "Worlds API",
  },
});

// Generate the Scalar API reference.
app.get("/scalar", Scalar({ url: "/doc" }));

export default app satisfies Deno.ServeDefaultExport;
