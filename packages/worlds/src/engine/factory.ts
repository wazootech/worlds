import type { DataPlane, ManagementPlane, EmbeddedWorldsOptions, RemoteWorldsOptions, WorldsInterface } from "./service.ts";

// Re-export interfaces from service.ts
export type { DataPlane, ManagementPlane } from "./service.ts";
export type { EmbeddedWorldsOptions, RemoteWorldsOptions, WorldsInterface } from "./service.ts";

export { EmbeddedWorlds, Worlds } from "./service.ts";
export { RemoteWorlds } from "../sdk/client.ts";