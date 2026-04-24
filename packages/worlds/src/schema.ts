// Public API types - explicit exports to control what's exposed
import type {
  ContentType,
  Source,
  TransactionMode,
  World,
  WorldId,
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  ListWorldsResponse,
  UpdateWorldRequest,
  SparqlQueryRequest,
  SparqlQueryResponse,
  SparqlSelectResults,
  SparqlAskResults,
  SparqlBinding,
  SparqlValue,
  SparqlQuad,
  SparqlQuadsResults,
  SearchWorldsRequest,
  SearchResult,
} from "@wazoo/worlds-spec";

export type {
  ContentType,
  Source,
  TransactionMode,
};

export type { World, WorldId };

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

export type {
  SparqlQueryRequest,
  SparqlQueryResponse,
  SparqlSelectResults,
  SparqlAskResults,
  SparqlBinding,
  SparqlValue,
  SparqlQuad,
  SparqlQuadsResults,
};

export type {
  SearchWorldsRequest,
  SearchResult,
};

// SDK-specific derived types
export type SearchWorldsResult = SearchResult;

export type SearchWorldsResponse = {
  results?: SearchWorldsResult[];
  nextPageToken?: string;
};

export type GetServiceDescriptionRequest = {
  sources?: Source[];
  contentType?: ContentType;
};

export type SparqlSelectResult = SparqlSelectResults;