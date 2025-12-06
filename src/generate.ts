import app, { openapiConfig } from "./main.ts";

if (import.meta.main) {
  const doc = app.getOpenAPIDocument(openapiConfig);
  await Deno.writeTextFile(
    "./src/openapi.json",
    JSON.stringify(doc, null, 2) + "\n",
  );
}
