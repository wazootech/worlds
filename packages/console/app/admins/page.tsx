import * as authkit from "@workos-inc/authkit-nextjs";
import { AdminList } from "./admin-list";
import { Metadata } from "next";
import { Suspense } from "react";
import { sdk } from "@/lib/sdk";
import type { Organization } from "@wazoo/sdk";

export const metadata: Metadata = {
  title: "Manage Admins",
};

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; after?: string }>;
}) {
  const { user } = await authkit.withAuth();
  if (!user) {
    return null;
  }

  const params = await searchParams;
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(params.pageSize ?? "25", 10)),
  );
  const after = params.after as string | undefined;

  const workos = authkit.getWorkOS();

  type WorkOSUser = Awaited<ReturnType<typeof workos.userManagement.getUser>>;

  // Fetch only the current page using WorkOS cursor pagination
  let paginatedOrganizations: WorkOSUser[] = [];
  let nextCursor: string | undefined;
  let hasMore = false;
  try {
    const response = await workos.userManagement.listUsers({
      limit: pageSize,
      ...(after ? { after } : {}),
    });

    paginatedOrganizations = response.data;
    nextCursor = response.listMetadata?.after;
    hasMore = !!nextCursor;
  } catch (e) {
    console.error("Failed to list organizations", e);
  }

  // Fetch accounts for each user concurrently.
  // Note: We use Promise.all here because the Worlds API doesn't currently
  // support a batch-get or filtered-list endpoint. This ensures we only
  // fetch exactly the accounts needed for the current page.
  const organizationsWithUsers = await Promise.all(
    paginatedOrganizations.map(async (user) => {
      let account: Organization | null = null;
      try {
        account = await sdk.organizations.get(user.id);
      } catch (error) {
        // Log error but continue - some users may not have accounts
        console.error(`Failed to fetch account for user ${user.id}:`, error);
      }
      return { user, account };
    }),
  );

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
          Organization Management
        </h1>
      </div>
      <p className="text-stone-500 dark:text-stone-400">
        Manage organizations and their admin status.
      </p>
      <Suspense
        fallback={
          <div className="text-stone-500 dark:text-stone-400">Loading...</div>
        }
      >
        <AdminList
          organizations={organizationsWithUsers}
          pageSize={pageSize}
          nextCursor={nextCursor}
          hasMore={hasMore}
          currentCursor={after}
        />
      </Suspense>
    </div>
  );
}
