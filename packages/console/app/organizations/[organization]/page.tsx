import { OrganizationDashboardContent } from "@/components/organization-dashboard-content";
import { sdk } from "@/lib/sdk";
import { notFound } from "next/navigation";

type Params = { organization: string };
type SearchParams = { page?: string; pageSize?: string };

export default async function OrganizationDashboard(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { organization: organizationId } = await props.params;
  const searchParams = await props.searchParams;

  const page = parseInt(searchParams.page || "1");
  const pageSize = parseInt(searchParams.pageSize || "20");

  // Fetch organization (verify organization existence)
  let organization;
  try {
    const { getOrganizationManagement } = await import("@/lib/auth");
    const orgMgmt = await getOrganizationManagement();
    organization = await orgMgmt.getOrganization(organizationId);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    notFound();
  }

  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;

  let worlds;
  try {
    worlds = await sdk.worlds.list({
      page,
      pageSize,
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

  return (
    <OrganizationDashboardContent
      worlds={worlds}
      page={page}
      pageSize={pageSize}
    />
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
