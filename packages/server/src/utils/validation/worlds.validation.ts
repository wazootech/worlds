import { z } from "zod";
import {
  zSource,
  zGetWorldRequest,
  zCreateWorldRequest,
  zUpdateWorldRequest,
  zDeleteWorldRequest,
  zListWorldsRequest,
  zExportWorldRequest,
  zImportWorldRequest,
  zSearchWorldsRequest,
  zSparqlQueryRequest,
} from "@wazoo/worlds-spec/zod";

export const sourceSchema = zSource;

export type Source = z.infer<typeof sourceSchema>;

export const worldsGetInputSchema = zGetWorldRequest;

export const worldsCreateInputSchema = zCreateWorldRequest;

export const worldsUpdateInputSchema = zUpdateWorldRequest;

export const worldsDeleteInputSchema = zDeleteWorldRequest;

export const worldsListInputSchema = zListWorldsRequest;

export const worldsExportInputSchema = zExportWorldRequest;

export const worldsImportInputSchema = zImportWorldRequest;

export const worldsSearchInputSchema = zSearchWorldsRequest;

export const worldsSparqlInputSchema = zSparqlQueryRequest;


