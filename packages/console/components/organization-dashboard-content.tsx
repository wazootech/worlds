"use client";

import { useOrganization } from "@/components/organization-context";
import { ConnectSdkButton } from "@/components/connect-sdk";
import { CreateWorldButton } from "@/components/create-world-button";
import { WorldList } from "@/components/world-list";
import type { World } from "@wazoo/sdk";

export function OrganizationDashboardContent({
  worlds,
  page,
  pageSize,
}: {
  worlds: World[];
  page: number;
  pageSize: number;
}) {
  const { organization, codeSnippet, maskedCodeSnippetHtml } =
    useOrganization();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
          My Worlds
          <span className="inline-flex items-center rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:text-stone-100">
            {worlds.length >= pageSize ? `${worlds.length}+` : worlds.length}
          </span>
        </h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <ConnectSdkButton
            codeSnippet={codeSnippet}
            maskedCodeSnippetHtml={maskedCodeSnippetHtml}
          />
          <CreateWorldButton />
        </div>
      </div>

      <WorldList
        organizationId={organization.id}
        initialData={worlds}
        initialPage={page}
        initialPageSize={pageSize}
      />
    </main>
  );
}
