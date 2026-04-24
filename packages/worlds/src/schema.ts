// Public API types - explicit exports to control what's exposed
import type {
  ContentType,
  CreateWorldRequest,
  DeleteWorldRequest,
  ExportWorldRequest,
  GetWorldRequest,
  ImportWorldRequest,
  ListWorldsRequest,
  ListWorldsResponse,
  SearchResult,
  SearchWorldsRequest,
  Source,
  SparqlAskResults,
  SparqlBinding,
  SparqlQuad,
  SparqlQuadsResults,
  SparqlQueryRequest,
  SparqlQueryResponse,
  SparqlSelectResults,
  SparqlValue,
  TransactionMode,
  UpdateWorldRequest,
  World,
  WorldId,
} from "@wazoo/worlds-spec";

export type { ContentType, Source, TransactionMode };

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
  SparqlAskResults,
  SparqlBinding,
  SparqlQuad,
  SparqlQuadsResults,
  SparqlQueryRequest,
  SparqlQueryResponse,
  SparqlSelectResults,
  SparqlValue,
};

export type { SearchResult, SearchWorldsRequest };

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
