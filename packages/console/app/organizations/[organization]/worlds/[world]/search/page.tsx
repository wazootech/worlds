import { notFound, redirect } from "next/navigation";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
import { PageHeader } from "@/components/page-header";
import { WorldTripleSearch } from "@/components/world-triple-search";

export default async function WorldSearchPage({
  params,
}: {
  params: Promise<{ organization: string; world: string }>;
}) {
  const { organization: organizationId, world: worldId } = await params;
  const { user } = await authkit.withAuth();

  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  const organization = await sdk.organizations.get(organizationId);
  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;
  const orgSlug = (organization as any).slug || organization.id;

  const world = await (sdk.worlds as any).get(worldId, { organizationId: actualOrgId });
  if (!world) {
    notFound();
  }

  const actualWorldId = world.id;
  const worldSlug = (world as any).slug || world.id;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-stone-50/50 dark:bg-stone-900/50">
      <PageHeader
        user={user}
        resource={[
          {
            label: organization.label || "Organization",
            href: `/organizations/${orgSlug}`,
          },
          {
            label: "Worlds",
            href: `/organizations/${orgSlug}`,
          },
          {
            label: world.label || "World",
            href: `/organizations/${orgSlug}/worlds/${worldSlug}`,
            icon: null,
            menuItems: [
              {
                label: "Overview",
                href: `/organizations/${orgSlug}/worlds/${worldSlug}`,
              },
              {
                label: "SPARQL",
                href: `/organizations/${orgSlug}/worlds/${worldSlug}/sparql`,
              },
              {
                label: "Search",
                href: `/organizations/${orgSlug}/worlds/${worldSlug}/search`,
              },
              {
                label: "Settings",
                href: `/organizations/${orgSlug}/worlds/${worldSlug}/settings`,
              },
            ],
          },
          { label: "Search" },
        ]}
        tabs={[
          {
            label: "Overview",
            href: `/organizations/${orgSlug}/worlds/${worldSlug}`,
          },
          {
            label: "SPARQL",
            href: `/organizations/${orgSlug}/worlds/${worldSlug}/sparql`,
          },
          {
            label: "Search",
            href: `/organizations/${orgSlug}/worlds/${worldSlug}/search`,
          },
          {
            label: "Settings",
            href: `/organizations/${orgSlug}/worlds/${worldSlug}/settings`,
          },
        ]}
      />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
        <WorldTripleSearch worldId={actualWorldId} />
      </div>
    </div>
  );
}
