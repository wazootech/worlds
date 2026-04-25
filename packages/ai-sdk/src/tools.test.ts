import { assertExists } from "@std/assert";
import { worldsSparqlTool } from "./tools/sparql.ts";
import { worldsSearchTool } from "./tools/search.ts";
import { worldsListWorldTool } from "./tools/list-world.ts";
import { worldsGetWorldTool } from "./tools/get-world.ts";
import { worldsCreateWorldTool } from "./tools/create-world.ts";
import { worldsUpdateWorldTool } from "./tools/update-world.ts";
import { worldsDeleteWorldTool } from "./tools/delete-world.ts";
import { worldsImportTool } from "./tools/import.ts";
import { worldsExportTool } from "./tools/export.ts";

Deno.test("sparql tool has correct shape", () => {
  assertExists(worldsSparqlTool.name);
  assertExists(worldsSparqlTool.description);
  assertExists(worldsSparqlTool.inputSchema);
  assertExists(worldsSparqlTool.outputSchema);
});

Deno.test("search tool has correct shape", () => {
  assertExists(worldsSearchTool.name);
  assertExists(worldsSearchTool.description);
  assertExists(worldsSearchTool.inputSchema);
  assertExists(worldsSearchTool.outputSchema);
});

Deno.test("listWorld tool has correct shape", () => {
  assertExists(worldsListWorldTool.name);
  assertExists(worldsListWorldTool.description);
  assertExists(worldsListWorldTool.inputSchema);
  assertExists(worldsListWorldTool.outputSchema);
});

Deno.test("getWorld tool has correct shape", () => {
  assertExists(worldsGetWorldTool.name);
  assertExists(worldsGetWorldTool.description);
  assertExists(worldsGetWorldTool.inputSchema);
  assertExists(worldsGetWorldTool.outputSchema);
});

Deno.test("createWorld tool has correct shape", () => {
  assertExists(worldsCreateWorldTool.name);
  assertExists(worldsCreateWorldTool.description);
  assertExists(worldsCreateWorldTool.inputSchema);
  assertExists(worldsCreateWorldTool.outputSchema);
});

Deno.test("updateWorld tool has correct shape", () => {
  assertExists(worldsUpdateWorldTool.name);
  assertExists(worldsUpdateWorldTool.description);
  assertExists(worldsUpdateWorldTool.inputSchema);
  assertExists(worldsUpdateWorldTool.outputSchema);
});

Deno.test("deleteWorld tool has correct shape", () => {
  assertExists(worldsDeleteWorldTool.name);
  assertExists(worldsDeleteWorldTool.description);
  assertExists(worldsDeleteWorldTool.inputSchema);
  assertExists(worldsDeleteWorldTool.outputSchema);
});

Deno.test("import tool has correct shape", () => {
  assertExists(worldsImportTool.name);
  assertExists(worldsImportTool.description);
  assertExists(worldsImportTool.inputSchema);
  assertExists(worldsImportTool.outputSchema);
});

Deno.test("export tool has correct shape", () => {
  assertExists(worldsExportTool.name);
  assertExists(worldsExportTool.description);
  assertExists(worldsExportTool.inputSchema);
  assertExists(worldsExportTool.outputSchema);
});
