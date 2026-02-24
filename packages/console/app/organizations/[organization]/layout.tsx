import { OrganizationProvider } from "@/components/organization-context";
import { OrganizationHeader } from "@/components/organization-header";
import { withAuth, getSignInUrl } from "@/lib/auth";
import { getWorkOS } from "@/lib/platform";
import { notFound, redirect } from "next/navigation";
import { codeToHtml } from "shiki";
import type { Metadata } from "next";

type Params = { organization: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationId } = await props.params;
  try {
    const workos = await getWorkOS();
    const organization = await workos.getOrganizationBySlug(organizationId);
    return {
      title: {
        template: `%s | ${organization?.name || "Organization"}`,
        default: organization?.name || "Organization",
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
  const { user } = await withAuth();

  if (!user) {
    const signInUrl = await getSignInUrl();
    redirect(signInUrl);
  }

  const isAdmin = !!user?.metadata?.admin;

  // Fetch organization via OrganizationManagement
  const workos = await getWorkOS();
  let organization;
  try {
    organization = await workos.getOrganizationBySlug(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    notFound();
  }

  if (!organization) {
    notFound();
  }

  // Generate general SDK snippets for the account
  const apiKey = organization.metadata?.apiKey || "YOUR_API_KEY";

  const apiUrl =
    (organization.metadata?.apiBaseUrl as string) || "http://localhost:8000";

  const codeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  baseUrl: "${apiUrl}",
  apiKey: "${apiKey}"
});

const worlds = await sdk.worlds.list();
console.log("My worlds:", worlds.length);`;

  const maskedApiKey =
    apiKey === "YOUR_API_KEY"
      ? "YOUR_API_KEY"
      : apiKey.slice(0, 4) + "..." + apiKey.slice(-4);

  const maskedCodeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  baseUrl: "${apiUrl}",
  apiKey: "${maskedApiKey}"
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
