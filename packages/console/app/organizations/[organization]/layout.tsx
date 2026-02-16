import { OrganizationProvider } from "@/components/organization-context";
import { OrganizationHeader } from "@/components/organization-header";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
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
      <OrganizationHeader />
      {children}
    </OrganizationProvider>
  );
}
