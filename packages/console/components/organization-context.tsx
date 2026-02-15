"use client";

import { createContext, useContext, ReactNode } from "react";
import type { Organization } from "@wazoo/sdk";
import type { AuthUser } from "@/lib/auth";

export interface OrganizationContextType {
  organization: Organization;
  apiKey: string;
  isAdmin: boolean;
  user: AuthUser;
  codeSnippet: string;
  maskedCodeSnippetHtml: string;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

export function OrganizationProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: OrganizationContextType;
}) {
  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider",
    );
  }
  return context;
}
