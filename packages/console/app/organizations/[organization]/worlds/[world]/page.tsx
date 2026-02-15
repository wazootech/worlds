import * as authkit from "@/lib/auth";
import { codeToHtml } from "shiki";
import { notFound, redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import { WorldDetails } from "@/components/world-details";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Globe, Settings, Terminal, Search } from "lucide-react";

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
      title: `${world?.label || "World"} | ${organization?.label || "Organization"}`,
    };
  } catch {
    return {
      title: "World Details",
    };
  }
}

export default async function WorldOverviewPage(props: {
  params: Promise<Params>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { organization: organizationId, world: worldId } = await props.params;

  // Check authentication
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  // Basic admin check (legacy-ish but kept)
  const isAdmin = !!user?.metadata?.admin;

  // Fetch organization (verify organization existence)
  let organization;
  try {
    organization = await sdk.organizations.get(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return null;
  }

  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;
  const orgSlug = (organization as any).slug || organization.id;

  // Fetch world data
  let world;
  try {
    world = await (sdk.worlds as any).get(worldId, { organizationId: actualOrgId });
  } catch (error) {
    console.error("Failed to fetch world:", error);
    return null;
  }

  if (!world || world.organizationId !== actualOrgId) {
    notFound();
  }

  const actualWorldId = world.id;
  const worldSlug = world.slug || world.id;

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

  // Generate code snippets
  const apiKey = (user?.metadata?.testApiKey as string) || "YOUR_API_KEY";
  const codeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  apiKey: "${apiKey}",
});

const world = await sdk.worlds.get("${actualWorldId}");
console.log("Connected to world:", world.label);`;

  const maskedApiKey = apiKey === "YOUR_API_KEY"
    ? "YOUR_API_KEY"
    : apiKey.slice(0, 4) + "..." + apiKey.slice(-4);

  const maskedCodeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  apiKey: "${maskedApiKey}",
});

const world = await sdk.worlds.get("${actualWorldId}");
console.log("Connected to world:", world.label);`;

  const codeSnippetHtml = await codeToHtml(codeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  const maskedCodeSnippetHtml = await codeToHtml(maskedCodeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  return (
    <>
      <PageHeader
        user={user}
        isAdmin={isAdmin}
        resource={{
          label: world.label,
          href: `/organizations/${orgSlug}/worlds/${worldSlug}`,
          icon: <Globe className="w-3 h-3 text-stone-500" />,
          menuItems: [
            { label: "Overview", href: `/organizations/${orgSlug}/worlds/${worldSlug}`, icon: <Globe className="w-4 h-4" /> },
            { label: "SPARQL", href: `/organizations/${orgSlug}/worlds/${worldSlug}/sparql`, icon: <Terminal className="w-4 h-4" /> },
            { label: "Search", href: `/organizations/${orgSlug}/worlds/${worldSlug}/search`, icon: <Search className="w-4 h-4" /> },
            { label: "Settings", href: `/organizations/${orgSlug}/worlds/${worldSlug}/settings`, icon: <Settings className="w-4 h-4" /> },
          ]
        }}
        tabs={tabs}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <WorldDetails
          world={world}
          organizationId={actualOrgId}
          codeSnippet={codeSnippet}
          maskedCodeSnippet={maskedCodeSnippet}
          codeSnippetHtml={codeSnippetHtml}
          maskedCodeSnippetHtml={maskedCodeSnippetHtml}
        />
      </main>
    </>
  );
}
