import { assertExists } from "@std/assert";
import { worldsSparqlTool } from "./tools/sparql.ts";
import { worldsSearchTool } from "./tools/search.ts";
import { worldsListTool } from "./tools/list.ts";
import { worldsGetTool } from "./tools/get.ts";
import { worldsCreateTool } from "./tools/create.ts";
import { worldsUpdateTool } from "./tools/update.ts";
import { worldsDeleteTool } from "./tools/delete.ts";
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

Deno.test("list tool has correct shape", () => {
  assertExists(worldsListTool.name);
  assertExists(worldsListTool.description);
  assertExists(worldsListTool.inputSchema);
  assertExists(worldsListTool.outputSchema);
});

Deno.test("get tool has correct shape", () => {
  assertExists(worldsGetTool.name);
  assertExists(worldsGetTool.description);
  assertExists(worldsGetTool.inputSchema);
  assertExists(worldsGetTool.outputSchema);
});

Deno.test("create tool has correct shape", () => {
  assertExists(worldsCreateTool.name);
  assertExists(worldsCreateTool.description);
  assertExists(worldsCreateTool.inputSchema);
  assertExists(worldsCreateTool.outputSchema);
});

Deno.test("update tool has correct shape", () => {
  assertExists(worldsUpdateTool.name);
  assertExists(worldsUpdateTool.description);
  assertExists(worldsUpdateTool.inputSchema);
  assertExists(worldsUpdateTool.outputSchema);
});

Deno.test("delete tool has correct shape", () => {
  assertExists(worldsDeleteTool.name);
  assertExists(worldsDeleteTool.description);
  assertExists(worldsDeleteTool.inputSchema);
  assertExists(worldsDeleteTool.outputSchema);
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
