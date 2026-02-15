import { notFound, redirect } from "next/navigation";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
import { PageHeader } from "@/components/page-header";
import { WorldSparqlPlayground } from "@/components/world-sparql-playground";

export default async function WorldSparqlPage({
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
  const orgSlug = organization.slug || organization.id;

  const world = await sdk.worlds.get(worldId, { organizationId: actualOrgId });
  if (!world) {
    notFound();
  }

  const actualWorldId = world.id;
  const worldSlug = world.slug || world.id;

  // Canonical redirect to slug if ID was used in the URL for either organization or world
  if (
    (organizationId === organization.id &&
      organization.slug &&
      organization.slug !== organization.id) ||
    (worldId === world.id && world.slug && world.slug !== world.id)
  ) {
    redirect(`/organizations/${orgSlug}/worlds/${worldSlug}/sparql`);
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-stone-50/50 dark:bg-stone-900/50">
      <PageHeader
        user={user}
        resource={[
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
          { label: "SPARQL" },
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

      <div className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-32 max-w-7xl mx-auto w-full">
        <WorldSparqlPlayground worldId={actualWorldId} />
      </div>
    </div>
  );
}
