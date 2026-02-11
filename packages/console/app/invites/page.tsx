import { sdk } from "@/lib/sdk";
import { CreateInviteButton } from "./create-button";
import { InviteList } from "./invite-list";
import { Metadata } from "next";
import { Invite } from "@wazoo/sdk";
import * as authkit from "@workos-inc/authkit-nextjs";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Manage Invites",
};

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  // Require admin access for the invites management page
  const { user } = await authkit.withAuth();
  if (!user) {
    notFound();
  }

  let currentUser = user;
  if (currentUser) {
    const workos = authkit.getWorkOS();
    currentUser = await workos.userManagement.getUser(currentUser.id);
  }

  if (!currentUser || !currentUser.metadata?.admin) {
    notFound();
  }

  // Check if user is a shadow user - redirect to root if plan is null/undefined or "shadow"
  try {
    const account = await sdk.organizations.get(user.id);
    if (account && (!account.plan || account.plan === "shadow")) {
      redirect("/");
    }
  } catch (error) {
    // If account fetch fails, allow through (admin check already passed)
    console.error("Failed to fetch account for shadow user check:", error);
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(params.pageSize ?? "25", 10)),
  );

  let invites: Invite[] = [];
  let hasMore = false;

  try {
    // Fetch one extra to check if there are more pages
    const response = await sdk.invites.list(page, pageSize + 1);
    invites = response.slice(0, pageSize);
    hasMore = response.length > pageSize;
  } catch (e) {
    console.error("Failed to list invites", e);
  }

  // Sort invites explicitly
  invites = invites.sort((a: Invite, b: Invite) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
      <div className="space-y-6 w-full min-w-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
            Invites
          </h1>
          <CreateInviteButton />
        </div>
        <p className="text-stone-500 dark:text-stone-400">
          Manage invite codes for early access.
        </p>
        <InviteList
          invites={invites}
          page={page}
          pageSize={pageSize}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}
