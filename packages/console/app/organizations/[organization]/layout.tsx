import { OrganizationProvider } from "@/components/organization-context";
import { PageHeader } from "@/components/page-header";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
import { BarChart3, LayoutGrid, Settings, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { codeToHtml } from "shiki";
import type { Metadata } from "next";

type Params = { organization: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationId } = await props.params;
  try {
    const organization = await sdk.organizations.get(organizationId);
    return {
      title: {
        template: `%s | ${organization?.label || "Organization"}`,
        default: organization?.label || "Organization",
      },
    };
  } catch {
    return {
      title: "Organization",
    };
  }
}

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { organization: organizationId } = await params;
  const { user } = await authkit.withAuth();

  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  const isAdmin = !!user?.metadata?.admin;

  // Fetch organization (verify organization existence)
  let organization;
  try {
    organization = await sdk.organizations.get(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    notFound();
  }

  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;
  const orgSlug = organization.slug || organization.id;

  // Canonical redirect to slug if ID was used in the URL
  if (
    organizationId === organization.id &&
    organization.slug &&
    organization.slug !== organization.id
  ) {
    redirect(`/organizations/${organization.slug}`);
  }

  // Generate general SDK snippets for the account
  const apiKey = (user?.metadata?.testApiKey as string) || "YOUR_API_KEY";

  const codeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  baseUrl: "https://api.wazoo.dev",
  apiKey: "${apiKey}"
});

const worlds = await sdk.worlds.list();
console.log("My worlds:", worlds.length);`;

  const maskedCodeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  baseUrl: "https://api.wazoo.dev",
  apiKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
});

const worlds = await sdk.worlds.list();
console.log("My worlds:", worlds.length);`;

  const maskedCodeSnippetHtml = await codeToHtml(maskedCodeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  return (
    <OrganizationProvider
      value={{
        organization,
        apiKey,
        isAdmin,
        user,
        codeSnippet,
        maskedCodeSnippetHtml,
      }}
    >
      <PageHeader
        user={user}
        isAdmin={isAdmin}
        resource={{
          label: "Worlds",
          href: `/organizations/${orgSlug}`,
          icon: <LayoutGrid className="w-3 h-3 text-stone-500" />,
          menuItems: [
            {
              label: "Worlds",
              href: `/organizations/${orgSlug}`,
              icon: <LayoutGrid className="w-4 h-4" />,
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
        }}
        tabs={[
          { label: "Worlds", href: `/organizations/${orgSlug}` },
          {
            label: "Service Accounts",
            href: `/organizations/${orgSlug}/service-accounts`,
          },
          { label: "Metrics", href: `/organizations/${orgSlug}/metrics` },
          { label: "Settings", href: `/organizations/${orgSlug}/settings` },
        ]}
      />
      {children}
    </OrganizationProvider>
  );
}
