export * from "@wazoo/worlds-spec";

export type {
  ChunkRow,
  ChunkRowUpsert,
  FactRow,
  FactRowUpsert,
  WorldRow,
  WorldRowUpsert,
} from "./resources/table.types.ts";
export type { ChunkId, FactId, WorldId } from "./resources/table.types.ts";

export type SearchWorldsResult = import("@wazoo/worlds-spec").SearchResult;
export type SearchWorldsResponse = {
  results?: SearchWorldsResult[];
  nextPageToken?: string;
};

export type GetServiceDescriptionRequest = {
  sources?: import("@wazoo/worlds-spec").Source[];
  contentType?: import("@wazoo/worlds-spec").ContentType;
};

export type SparqlSelectResult =
  import("@wazoo/worlds-spec").SparqlSelectResults;

import type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  ListWorldsResponse,
  UpdateWorldRequest,
} from "@wazoo/worlds-spec";

export type {
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  ListWorldsResponse,
  UpdateWorldRequest,
};

export type WorldsManagementPlane = {
  listWorlds(input?: ListWorldsRequest): Promise<ListWorldsResponse>;
  getWorld(
    input: GetWorldRequest,
  ): Promise<import("@wazoo/worlds-spec").World | null>;
  createWorld(
    input: CreateWorldRequest,
  ): Promise<import("@wazoo/worlds-spec").World>;
  updateWorld(
    input: UpdateWorldRequest,
  ): Promise<import("@wazoo/worlds-spec").World>;
  deleteWorld(input: DeleteWorldRequest): Promise<void>;
};
