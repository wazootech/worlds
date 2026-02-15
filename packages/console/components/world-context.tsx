"use client";

import { createContext, useContext, ReactNode } from "react";
import type { World, Organization } from "@wazoo/sdk";

export interface WorldContextType {
  world: World;
  organization: Organization;
  apiKey: string;
  codeSnippet: string;
  maskedCodeSnippetHtml: string;
  isAdmin: boolean;
}

const WorldContext = createContext<WorldContextType | undefined>(undefined);

export function WorldProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WorldContextType;
}) {
  return (
    <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
  );
}

export function useWorld() {
  const context = useContext(WorldContext);
  if (context === undefined) {
    throw new Error("useWorld must be used within a WorldProvider");
  }
  return context;
}
