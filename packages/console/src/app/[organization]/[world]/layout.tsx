import { withAuth, getSignInUrl } from "@/lib/auth";
import { getWorkOS } from "@/lib/platform";
import { codeToHtml } from "shiki";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Globe, Settings, LayoutGrid } from "lucide-react";
import { WorldProvider } from "@/components/world-context";
import type { Metadata } from "next";
import { getWorldsByOrgMetadata } from "@/lib/worlds";

type Params = { organization: string; world: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationSlug, world: worldSlug } =
    await props.params;
  try {
    const workos = await getWorkOS();
    let organization;
    if (organizationSlug.startsWith("org_")) {
      organization = await workos.getOrganization(organizationSlug);
    } else {
      organization = await workos.getOrganizationBySlug(organizationSlug);
    }
    if (!organization) return { title: "World" };

    const worlds = getWorldsByOrgMetadata(organization);
    const world = await worlds.get(worldSlug);
    if (!world) return { title: "World" };

    return {
      title: {
        template: `%s | ${world.slug || "World"} | Wazoo`,
        default: `${world.slug || "World"} | Wazoo`,
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
  const { user } = await withAuth();

  if (!user) {
    const signInUrl = await getSignInUrl();
    redirect(signInUrl);
  }

  const isAdmin = !!user?.metadata?.admin;

  // Fetch organization
  const organization = await (async () => {
    try {
      const workos = await getWorkOS();
      return await workos.getOrganizationBySlug(organizationId);
    } catch {
      return null;
    }
  })();

  if (!organization) {
    notFound();
  }

  if (!organization.slug) notFound();

  // Fetch world and list
  let world;
  let worldsList = [];
  try {
    const worlds = getWorldsByOrgMetadata(organization);
    const [worldData, worldsData] = await Promise.all([
      worlds.get(worldId),
      worlds.list({ page: 1, pageSize: 100 }),
    ]);
    world = worldData;
    worldsList = worldsData;
  } catch {
    notFound();
  }

  if (!world) {
    notFound();
  }

  if (!world.slug) notFound();

  // Canonical redirect
  if (
    organizationId === organization.id &&
    organization.slug &&
    organization.slug !== organization.id
  ) {
    redirect(`/${organization.slug}/${world.slug}`);
  }

  const tabs = [
    {
      label: "Overview",
      href: `/${organization.slug}/${world.slug}`,
    },
    {
      label: "SPARQL",
      href: `/${organization.slug}/${world.slug}/sparql`,
    },
    {
      label: "Search",
      href: `/${organization.slug}/${world.slug}/search`,
    },
    {
      label: "Logs",
      href: `/${organization.slug}/${world.slug}/logs`,
    },
    {
      label: "Settings",
      href: `/${organization.slug}/${world.slug}/settings`,
    },
  ];

  // Snippets
  const apiUrl =
    (organization.metadata?.apiBaseUrl as string) || "http://localhost:8000";

  const apiKey = (organization.metadata?.apiKey as string) || "YOUR_API_KEY";

  const worldIdSnippet = world.slug;
  if (!worldIdSnippet) throw new Error("World is missing a slug");
  const codeSnippet = `import { Worlds } from "@wazoo/worlds-sdk";

const worlds = new Worlds({
  baseUrl: "${apiUrl}",
  apiKey: "${apiKey}"
});

// Resolve a world by its slug.
const world = await worlds.get("${worldIdSnippet}");
console.log("Connected to world:", world.label);`;

  const maskedApiKey =
    apiKey === "YOUR_API_KEY"
      ? "YOUR_API_KEY"
      : apiKey.slice(0, 4) + "..." + apiKey.slice(-4);

  const maskedCodeSnippet = `import { Worlds } from "@wazoo/worlds-sdk";

const worlds = new Worlds({
  baseUrl: "${apiUrl}",
  apiKey: "${maskedApiKey}"
});

// Resolve a world by its slug.
const world = await worlds.get("${worldIdSnippet}");
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
              href: `/${organization.slug}`,
              icon: <LayoutGrid className="w-3 h-3 text-stone-500" />,
              menuItems: [
                {
                  label: "Worlds",
                  href: `/${organization.slug}`,
                  icon: <Globe className="w-4 h-4" />,
                },
                {
                  label: "Settings",
                  href: `/${organization.slug}/~/settings`,
                  icon: <Settings className="w-4 h-4" />,
                },
              ],
            },
            {
              label: world.label,
              href: `/${organization.slug}/${world.slug}`,
              icon: <Globe className="w-3 h-3 text-stone-500" />,
              menuItems: worldsList
                .map((w) => {
                  if (!w.slug) return null;
                  return {
                    label: w.label || w.slug,
                    href: `/${organization.slug}/${w.slug}`,
                    icon: <Globe className="w-4 h-4" />,
                  };
                })
                .filter((i): i is NonNullable<typeof i> => i !== null),
              resourceType: "World",
              createHref: `/${organization.slug}?create=world`,
            },
          ]}
          tabs={tabs}
        />
        {children}
      </div>
    </WorldProvider>
  );
}
