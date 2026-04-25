import {
  ApiKeyRepository,
  SecureWorlds,
  setResolverConfig,
  Worlds,
} from "@wazoo/worlds-sdk";
import { createServer } from "./server.ts";

const resolverConfig = {
  defaultNamespace: Deno.env.get("WORLDS_NS"),
  defaultId: Deno.env.get("WORLDS_ID"),
};
if (resolverConfig.defaultNamespace || resolverConfig.defaultId) {
  setResolverConfig(resolverConfig);
}

const apiKeyRepository = new ApiKeyRepository();

const worlds = new Worlds({
  namespace: Deno.env.get("WORLDS_NS"),
});
await worlds.init();

const secureWorlds = new SecureWorlds({
  worlds,
  apiKeyRepository,
  adminApiKey: Deno.env.get("WORLDS_API_KEY"),
});

const app = createServer(secureWorlds);

export default {
  fetch: (request: Request) => app.fetch(request),
} as Deno.ServeDefaultExport;
