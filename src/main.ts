import { Router } from "@fartlabs/rt";
import { kvAppContext } from "#/app-context.ts";

const kv = await Deno.openKv(Deno.env.get("DENO_KV_PATH"));

const appContext = kvAppContext(kv);

const app = new Router();

const routes = [
  "v1/routes/worlds/route.ts",
  "v1/routes/worlds/sparql/route.ts",
  "v1/routes/accounts/route.ts",
  "v1/routes/usage/route.ts",
];

for (const specifier of routes) {
  const module = await import(`./${specifier}`);
  if (!(typeof module.default === "function")) {
    throw new Error(`Route ${specifier} does not export a default function`);
  }

  const subRouter = module.default(appContext);
  app.use(subRouter);
}

export default {
  fetch: (request: Request) => app.fetch(request),
} satisfies Deno.ServeDefaultExport;
