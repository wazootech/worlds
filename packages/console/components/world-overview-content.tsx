"use client";

import { useWorld } from "@/components/world-context";
import { WorldDetails } from "@/components/world-details";

export function WorldOverviewContent() {
  const { world, organization, codeSnippet, maskedCodeSnippetHtml } =
    useWorld();
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <WorldDetails
        world={world}
        organizationId={organization.id}
        codeSnippet={codeSnippet}
        maskedCodeSnippetHtml={maskedCodeSnippetHtml}
      />
    </main>
  );
}
