import { withAuth } from "@/lib/auth";
import { getWorkOS } from "@/lib/platform";
import { AdminList } from "./admin-list";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Manage Admins",
};

export default async function AdminsPage({
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

  type WorkOSUser = Awaited<ReturnType<typeof workos.getUser>>;

  // Fetch only the current page using WorkOS cursor pagination
  let paginatedOrganizations: WorkOSUser[] = [];
  let nextCursor: string | undefined;
  let hasMore = false;
  try {
    const response = await workos.listUsers({
      limit: pageSize,
      ...(after ? { after } : {}),
    });

    paginatedOrganizations = response.data;
    nextCursor = response.listMetadata?.after;
    hasMore = !!nextCursor;
  } catch (e) {
    console.error("Failed to list organizations", e);
  }

  // Fetch organizations for each user concurrently.
  const organizationsWithUsers = await Promise.all(
    paginatedOrganizations.map(async (user) => {
      let organization: import("@/lib/auth").AuthOrganization | null = null;
      try {
        const organizationId = user.metadata?.activeOrganizationId as
          | string
          | undefined;
        if (organizationId) {
          const workos = await getWorkOS();
          organization = await workos.getOrganization(organizationId);
        }
      } catch (error) {
        // Log error but continue - some organizations may not be initialized
        console.error(
          `Failed to fetch organization for user ${user.id}:`,
          error,
        );
      }
      return { user, organization };
    }),
  );

  return (
    <div className="space-y-6 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
          User Management
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
