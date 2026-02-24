import { getWorkOS } from "@/lib/platform";
import { OrganizationDashboardContent } from "@/components/organization-dashboard-content";
import { getSdkForOrg } from "@/lib/org-sdk";
import type { World } from "@wazoo/sdk";
import { notFound } from "next/navigation";

type Params = { organization: string };
type SearchParams = { page?: string; pageSize?: string };

export default async function OrganizationDashboard(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { organization: organizationSlug } = await props.params;
  const searchParams = await props.searchParams;

  const page = parseInt(searchParams.page || "1");
  const pageSize = parseInt(searchParams.pageSize || "20");

  // Fetch organization (verify organization existence)

  let organization;
  try {
    const workos = await getWorkOS();

    organization = await workos.getOrganizationBySlug(organizationSlug);
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    notFound();
  }

  if (!organization) {
    notFound();
  }

  const actualOrgId = organization.id;

  let worlds: World[] = [];
  // Resolve organization first
  // organization is already fetched above
  const sdk = getSdkForOrg(organization);

  try {
    worlds = await sdk.worlds.list({
      page,
      pageSize,
      organizationId: actualOrgId,
    });
  } catch (error) {
    console.error("Failed to list worlds:", error);
    // Graceful fallback for offline deployments/servers
    worlds = [];
  }

  return (
    <OrganizationDashboardContent
      worlds={worlds}
      page={page}
      pageSize={pageSize}
    />
  );
}
