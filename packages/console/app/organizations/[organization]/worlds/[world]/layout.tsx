import * as authkit from "@/lib/auth";
import { codeToHtml } from "shiki";
import { notFound, redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import { PageHeader } from "@/components/page-header";
import {
  Globe,
  Settings,
  LayoutGrid,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { WorldProvider } from "@/components/world-context";
import type { Metadata } from "next";

type Params = { organization: string; world: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationSlug, world: worldSlug } =
    await props.params;
  try {
    const organization = await sdk.organizations.get(organizationSlug);
    if (!organization) return { title: "World" };

    const world = await sdk.worlds.get(worldSlug, {
      organizationId: organization.id,
    });
    if (!world) return { title: "World" };

    return {
      title: {
        template: `%s | ${world.slug || world.id || "World"} | Wazoo`,
        default: `${world.slug || world.id || "World"} | Wazoo`,
      },
    };
  } catch {
    return {
      title: "World",
    };
  }
}

export default async function WorldLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { organization: organizationId, world: worldId } = await params;
  const { user } = await authkit.withAuth();

  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  const isAdmin = !!user?.metadata?.admin;

  // Fetch organization
  let organization;
  try {
    organization = await sdk.organizations.get(organizationId);
  } catch {
    notFound();
  }

  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;
  const orgSlug = organization.slug || organization.id;

  // Fetch world and list
  let world;
  let worlds = [];
  try {
    const [worldData, worldsData] = await Promise.all([
      sdk.worlds.get(worldId, { organizationId: actualOrgId }),
      sdk.worlds.list(1, 100, { organizationId: actualOrgId }),
    ]);
    world = worldData;
    worlds = worldsData;
  } catch {
    notFound();
  }

  if (!world || world.organizationId !== actualOrgId) {
    notFound();
  }

  const worldSlug = world.slug || world.id;

  // Canonical redirect
  if (
    (organizationId === organization.id &&
      organization.slug &&
      organization.slug !== organization.id) ||
    (worldId === world.id && world.slug && world.slug !== world.id)
  ) {
    redirect(`/organizations/${orgSlug}/worlds/${worldSlug}`);
  }

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

  // Snippets
  const apiKey = (user?.metadata?.testApiKey as string) || "YOUR_API_KEY";
  const worldIdSnippet = world.id;
  const codeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  apiKey: "${apiKey}",
});

const world = await sdk.worlds.get("${worldIdSnippet}");
console.log("Connected to world:", world.label);`;

  const maskedApiKey =
    apiKey === "YOUR_API_KEY"
      ? "YOUR_API_KEY"
      : apiKey.slice(0, 4) + "..." + apiKey.slice(-4);
  const maskedCodeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  apiKey: "${maskedApiKey}",
});

const world = await sdk.worlds.get("${worldIdSnippet}");
console.log("Connected to world:", world.label);`;

  const maskedCodeSnippetHtml = await codeToHtml(maskedCodeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  return (
    <WorldProvider
      value={{
        world,
        organization,
        apiKey,
        codeSnippet,
        maskedCodeSnippetHtml,
        isAdmin,
      }}
    >
      <div className="flex-1 flex flex-col min-w-0 bg-stone-50/50 dark:bg-stone-900/50">
        <PageHeader
          user={user}
          isAdmin={isAdmin}
          resource={[
            {
              label: "Worlds",
              href: `/organizations/${orgSlug}`,
              icon: <LayoutGrid className="w-3 h-3 text-stone-500" />,
              menuItems: [
                {
                  label: "Worlds",
                  href: `/organizations/${orgSlug}`,
                  icon: <Globe className="w-4 h-4" />,
                },
                {
                  label: "Service Accounts",
                  href: `/organizations/${orgSlug}/service-accounts`,
                  icon: <ShieldCheck className="w-4 h-4" />,
                },
                {
                  label: "Metrics",
                  href: `/organizations/${orgSlug}/metrics`,
                  icon: <BarChart3 className="w-4 h-4" />,
                },
                {
                  label: "Settings",
                  href: `/organizations/${orgSlug}/settings`,
                  icon: <Settings className="w-4 h-4" />,
                },
              ],
            },
            {
              label: world.label,
              href: `/organizations/${orgSlug}/worlds/${worldSlug}`,
              icon: <Globe className="w-3 h-3 text-stone-500" />,
              menuItems: worlds.map((w) => ({
                label: w.label || w.slug || w.id,
                href: `/organizations/${orgSlug}/worlds/${w.slug || w.id}`,
                icon: <Globe className="w-4 h-4" />,
              })),
              resourceType: "World",
              createHref: `/organizations/${orgSlug}?create=world`,
            },
          ]}
          tabs={tabs}
        />
        {children}
      </div>
    </WorldProvider>
  );
}
