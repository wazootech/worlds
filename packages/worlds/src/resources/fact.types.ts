import type { Fact, FactId as FactIdGen } from "../api/v1/types.gen.ts";

export type FactId = FactIdGen;
export type FactTable = Fact;

export type FactTableUpsert = Omit<FactTable, "created_at" | "deleted_at">;
