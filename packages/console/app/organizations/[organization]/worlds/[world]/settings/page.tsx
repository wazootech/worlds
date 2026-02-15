import { PageHeader } from "@/components/page-header";
import { Globe, Terminal, Search, Settings } from "lucide-react";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WorldSettingsForm } from "@/components/world-settings-form";

type Params = { organization: string; world: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationId, world: worldId } = await props.params;

  try {
    const [world, organization] = await Promise.all([
      (sdk.worlds as any).get(worldId, { organizationId }),
      sdk.organizations.get(organizationId),
    ]);
    return {
      title: `Settings | ${world?.label || "World"} | ${organization?.label || "Organization"}`,
    };
  } catch {
    return {
      title: "Settings",
    };
  }
}

export default async function WorldSettingsPage(props: {
  params: Promise<Params>;
}) {
  const { organization: organizationId, world: worldId } = await props.params;
  const { user } = await authkit.withAuth();

  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  const isAdmin = !!user?.metadata?.admin;

  let organization;
  try {
    organization = await sdk.organizations.get(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return notFound();
  }

  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;
  const orgSlug = (organization as any).slug || organization.id;

  let world;
  try {
    world = await (sdk.worlds as any).get(worldId, { organizationId: actualOrgId });
  } catch (error) {
    console.error("Failed to fetch world:", error);
    return notFound();
  }

  if (!world || world.organizationId !== actualOrgId) {
    notFound();
  }

  const actualWorldId = world.id;
  const worldSlug = (world as any).slug || world.id;

  const tabs = [
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
  ];

  const resourceMenuItems = [
    { label: "Overview", href: `/organizations/${orgSlug}/worlds/${worldSlug}`, icon: <Globe className="w-4 h-4" /> },
    { label: "SPARQL", href: `/organizations/${orgSlug}/worlds/${worldSlug}/sparql`, icon: <Terminal className="w-4 h-4" /> },
    { label: "Search", href: `/organizations/${orgSlug}/worlds/${worldSlug}/search`, icon: <Search className="w-4 h-4" /> },
    { label: "Settings", href: `/organizations/${orgSlug}/worlds/${worldSlug}/settings`, icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      <PageHeader
        user={user}
        isAdmin={isAdmin}
        resource={{
          label: world.label,
          href: `/organizations/${orgSlug}/worlds/${worldSlug}`,
          icon: <Globe className="w-3 h-3 text-stone-500" />,
          menuItems: resourceMenuItems,
        }}
        tabs={tabs}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
              World Settings
            </h1>
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Manage your world's details and identification.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white mb-4">
                Basic Details
              </h2>
              <WorldSettingsForm 
                initialLabel={world.label} 
                initialSlug={(world as any).slug} 
                initialDescription={world.description} 
              />
            </div>
            <div className="bg-stone-50 dark:bg-stone-950/50 px-6 py-4 border-t border-stone-200 dark:border-stone-800">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Internal World ID: <code className="font-mono">{world.id}</code>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
