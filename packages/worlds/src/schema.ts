export * from "./api/v1/types.gen.ts";

export type { World, WorldId } from "./resources/world.types.ts";
export type { ChunkTable, ChunkTableUpsert, ChunkId } from "./resources/chunk.types.ts";
export type { FactTable, FactTableUpsert, FactId } from "./resources/fact.types.ts";

export type SearchWorldsResult = import("./api/v1/types.gen.ts").SearchResult;
export type SearchWorldsResponse = {
  results?: SearchWorldsResult[];
  nextPageToken?: string;
};

export type GetServiceDescriptionRequest = {
  sources?: import("./api/v1/types.gen.ts").Source[];
  contentType?: import("./api/v1/types.gen.ts").ContentType;
};

export type SparqlSelectResult = import("./api/v1/types.gen.ts").SparqlSelectResults;

export type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  ListWorldsResponse,
  UpdateWorldRequest,
} from "./api/v1/types.gen.ts";

export type WorldsManagementPlane = {
  listWorlds(input?: ListWorldsRequest): Promise<ListWorldsResponse>;
  getWorld(input: GetWorldRequest): Promise<import("./api/v1/types.gen.ts").World | null>;
  createWorld(input: CreateWorldRequest): Promise<import("./api/v1/types.gen.ts").World>;
  updateWorld(input: UpdateWorldRequest): Promise<import("./api/v1/types.gen.ts").World>;
  deleteWorld(input: DeleteWorldRequest): Promise<void>;
};
