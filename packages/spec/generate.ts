import { OpenApiBuilder } from "openapi3-ts";
import { stringify } from "@std/yaml";
import * as schemas from "./schemas/mod.ts";
import * as paths from "./paths/mod.ts";

/**
 * Build the OpenAPI 3.1.0 specification.
 */
export function buildSpec(): ReturnType<typeof OpenApiBuilder.create> {
  const builder = new OpenApiBuilder({
    openapi: "3.1.0",
    info: {
      title: "Worlds API",
      version: "1.0.0",
      description:
        "API for managing decentralized, multi-model semantic worlds.",
    },
  });

  // Add all schemas
  for (const [name, schema] of Object.entries(schemas)) {
    builder.addSchema(name, schema);
  }

  // Add all paths
  builder.addPath("/rpc/worlds", paths.rpcWorlds);

  return builder.getSpec();
}

/**
 * Orchestrate the generation process.
 */
async function main() {
  const spec = buildSpec();
  const specYaml = stringify(spec);

  const specPath = new URL("./spec.yaml", import.meta.url);
  console.log(`📝 Writing OpenAPI spec to ${specPath.pathname}...`);
  await Deno.writeTextFile(specPath, specYaml);

  console.log("✨ Triggering @hey-api/openapi-ts...");
  const command = new Deno.Command("npx", {
    args: ["@hey-api/openapi-ts", "-f", "openapi-ts.config.ts"],
    cwd: new URL(".", import.meta.url),
  });

  const { success, stderr } = await command.output();

  if (success) {
    console.log("✅ Generation complete!");

    // Clean up unwanted files to satisfy "that's it" requirement
    try {
      const indexPath = new URL("./index.ts", import.meta.url);
      await Deno.remove(indexPath);
    } catch {
      // Ignore if file doesn't exist
    }

    // Clean up any error logs
    try {
      for await (const entry of Deno.readDir(new URL(".", import.meta.url))) {
        if (
          entry.name.startsWith("openapi-ts-error-") &&
          entry.name.endsWith(".log")
        ) {
          await Deno.remove(new URL(`./${entry.name}`, import.meta.url));
        }
      }
    } catch {
      // Ignore if directory reading fails
    }
  } else {
    console.error("❌ Generation failed:");
    console.error(new TextDecoder().decode(stderr));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
