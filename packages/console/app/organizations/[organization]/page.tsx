import { PageHeader } from "@/components/page-header";
import { LayoutGrid, ShieldCheck, BarChart3, Settings } from "lucide-react";
import * as authkit from "@/lib/auth";
import { sdk } from "@/lib/sdk";
import { CreateWorldButton } from "@/components/create-world-button";
import { Metadata } from "next";
import { codeToHtml } from "shiki";
import { ConnectSdkButton } from "@/components/connect-sdk";
import { WorldList } from "@/components/world-list";

type Params = { organization: string };
type SearchParams = { page?: string; pageSize?: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { organization: organizationId } = await props.params;
  try {
    const organization = await sdk.organizations.get(organizationId);
    return {
      title: organization?.label || "Organization",
    };
  } catch {
    return {
      title: "Organization",
    };
  }
}

export default async function OrganizationDashboard(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { organization: organizationId } = await props.params;
  const searchParams = await props.searchParams;
  const { user } = await authkit.withAuth();

  const page = parseInt(searchParams.page || "1");
  const pageSize = parseInt(searchParams.pageSize || "20");


  // Fetch organization (verify organization existence)
  let organization;
  try {
    organization = await sdk.organizations.get(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return (
      <ErrorState
        title="Organization Not Found"
        message="The requested organization could not be found."
        titleClassName="text-red-600"
      />
    );
  }

  if (!organization) {
    return (
      <ErrorState
        title="Organization Not Found"
        message="The requested organization could not be found."
      />
    );
  }

  // Use the actual ID for subsequent lookups if possible, or stick to slug if organizationId is the slug
  const actualOrgId = organization.id;
  const orgSlug = (organization as any).slug || organization.id;

  let worlds;
  try {
    worlds = await sdk.worlds.list(page, pageSize, {
      organizationId: actualOrgId,
    });
  } catch (error) {
    console.error("Failed to list worlds:", error);
    return (
      <ErrorState
        title="Error Loading Worlds"
        message="Failed to load worlds. Please check your API permissions."
        titleClassName="text-red-600"
      />
    );
  }

  const isAdmin = !!user?.metadata?.admin;

  const tabs = [
    {
      label: "Worlds",
      href: `/organizations/${orgSlug}`,
      count: worlds.length,
    },
    {
      label: "Service Accounts",
      href: `/organizations/${orgSlug}/service-accounts`,
    },
    { label: "Metrics", href: `/organizations/${orgSlug}/metrics` },
    { label: "Settings", href: `/organizations/${orgSlug}/settings` },
  ];

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
        tabs={tabs}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
            My Worlds
            <span className="inline-flex items-center rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:text-stone-100">
              {worlds.length >= pageSize ? `${worlds.length}+` : worlds.length}
            </span>
          </h1>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <ConnectSdkButton
              codeSnippet={codeSnippet}
              maskedCodeSnippet={maskedCodeSnippet}
              codeSnippetHtml={codeSnippetHtml}
              maskedCodeSnippetHtml={maskedCodeSnippetHtml}
            />
            <CreateWorldButton />
          </div>
        </div>

        <WorldList
          organizationId={organizationId}
          initialData={worlds}
          initialPage={page}
          initialPageSize={pageSize}
        />
      </main>
    </>
  );
}

function ErrorState({
  title,
  message,
  titleClassName = "text-stone-900 dark:text-stone-50",
}: {
  title: string;
  message: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-stone-50 dark:bg-stone-950 font-sans">
      <div className="text-center">
        <h1 className={`text-xl font-bold mb-2 ${titleClassName}`}>{title}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">{message}</p>
      </div>
    </div>
  );
}
