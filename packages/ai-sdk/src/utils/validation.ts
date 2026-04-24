import {
  zSource,
  zWorld,
  zCreateWorldRequest,
  zUpdateWorldRequest,
  zDeleteWorldRequest,
  zListWorldsRequest,
  zSearchWorldsRequest,
  zSearchResult,
  zSparqlQueryRequest,
  zExportWorldRequest,
  zImportWorldRequest,
  zGetWorldRequest,
} from "@wazoo/worlds-spec/zod";

export const SourceSchema = zSource;

export const WorldSchema = zWorld;

export const GetWorldRequestSchema = zGetWorldRequest;

export const ListWorldsRequestSchema = zListWorldsRequest;

export const CreateWorldRequestSchema = zCreateWorldRequest;

export const UpdateWorldRequestSchema = zUpdateWorldRequest;

export const DeleteWorldRequestSchema = zDeleteWorldRequest;

export const SearchWorldsRequestSchema = zSearchWorldsRequest;

export const SearchWorldsResultSchema = zSearchResult;

export const SparqlQueryRequestSchema = zSparqlQueryRequest;

export const ExportWorldRequestSchema = zExportWorldRequest;

export const ImportWorldRequestSchema = zImportWorldRequest;
