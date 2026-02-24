import { withAuth, type AuthOrganization } from "@/lib/auth";
import { getWorkOS } from "@/lib/platform";
import { OrgList } from "./org-list";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Manage Organizations",
};

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; after?: string }>;
}) {
  const { user } = await withAuth();
  if (!user) {
    return null;
  }

  const params = await searchParams;
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(params.pageSize ?? "25", 10)),
  );
  const after = params.after as string | undefined;

  const workos = await getWorkOS();
  let paginatedOrganizations: AuthOrganization[] = [];
  let nextCursor: string | undefined;
  let hasMore = false;

  try {
    const listOptions: { limit: number; after?: string } = {
      limit: pageSize,
    };
    if (after) {
      listOptions.after = after;
    }

    const response = await workos.listOrganizations(listOptions);
    paginatedOrganizations = response.data;
    nextCursor = response.listMetadata?.after;
    hasMore = !!nextCursor;
  } catch (e) {
    console.error("Failed to list organizations", e);
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
          Organizations
        </h1>
      </div>
      <p className="text-stone-500 dark:text-stone-400">
        Manage organizations across the platform.
      </p>
      <Suspense
        fallback={
          <div className="text-stone-500 dark:text-stone-400">Loading...</div>
        }
      >
        <OrgList
          organizations={paginatedOrganizations}
          pageSize={pageSize}
          nextCursor={nextCursor}
          hasMore={hasMore}
          currentCursor={after}
        />
      </Suspense>
    </div>
  );
}
