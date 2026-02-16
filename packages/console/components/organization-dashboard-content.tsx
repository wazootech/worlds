"use client";

import { useOrganization } from "@/components/organization-context";
import { ConnectSdkButton } from "@/components/connect-sdk";
import { CreateWorldButton } from "@/components/create-world-button";
import { WorldList } from "@/components/world-list";
import type { World } from "@wazoo/sdk";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

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

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const createMode = searchParams.get("create");
  const isCreateOpen = createMode === "world";

  const handleOpenChange = (open: boolean) => {
    if (open) {
      router.push(`${pathname}?create=world`, { scroll: false });
    } else {
      router.replace(pathname, { scroll: false });
    }
  };

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
            My Worlds
          </h1>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <ConnectSdkButton
              codeSnippet={codeSnippet}
              maskedCodeSnippetHtml={maskedCodeSnippetHtml}
            />
            <CreateWorldButton
              isOpen={isCreateOpen}
              onOpenChange={handleOpenChange}
            />
          </div>
        </div>

        <WorldList
          organizationSlug={organization.slug || organization.id}
          initialData={worlds}
          initialPage={page}
          initialPageSize={pageSize}
        />
      </div>
    </main>
  );
}
