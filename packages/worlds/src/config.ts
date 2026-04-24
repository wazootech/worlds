import type { WorldsOptions } from "./engine/service.ts";

export interface ParsedUrl {
  scheme: string;
  host: string;
  port: string;
  path: string;
  params: Record<string, string>;
}

export interface ResolvedConfig {
  mode: "embedded" | "remote";
  storageType: "memory" | "file";
  filePath?: string;
  baseUrl?: string;
  authToken?: string;
  namespace?: string;
}

const DEFAULT_EMBEDDED = "embedded:memory";

export function parseUrl(url: string): ParsedUrl {
  if (!url || url.trim() === "") {
    url = DEFAULT_EMBEDDED;
  }

  const parsed = new URL(url);

  const params: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return {
    scheme: parsed.protocol.replace(":", ""),
    host: parsed.hostname,
    port: parsed.port,
    path: parsed.pathname,
    params,
  };
}

export function resolveConfig(options: WorldsOptions): ResolvedConfig {
  const url = options.url ?? DEFAULT_EMBEDDED;
  const parsed = parseUrl(url);

  let authToken = options.authToken;
  if (parsed.params.token) {
    authToken = parsed.params.token;
  }

  const namespace = options.namespace ?? parsed.params.namespace;

  if (parsed.scheme === "embedded" || parsed.scheme === "memory" || parsed.scheme === "file") {
    const isMemory = parsed.scheme === "memory" || parsed.scheme === "embedded" || 
      (parsed.scheme === "file" && (parsed.path === "" || parsed.path === "/"));

    return {
      mode: "embedded",
      storageType: isMemory ? "memory" : "file",
      filePath: isMemory ? undefined : parsed.path,
      authToken,
      namespace,
    };
  }

  if (parsed.scheme === "http" || parsed.scheme === "https" || 
      parsed.scheme === "ws" || parsed.scheme === "wss") {
    const baseUrl = `${parsed.scheme}://${parsed.host}${parsed.port ? ":" + parsed.port : ""}${parsed.path}`;
    return {
      mode: "remote",
      storageType: "memory",
      baseUrl,
      authToken,
      namespace,
    };
  }

  throw new Error(`Unsupported URL scheme: ${parsed.scheme}. Use embedded:, file:, http:, https:, ws:, or wss:`);
}