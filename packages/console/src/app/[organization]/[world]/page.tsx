import { getWorkOS } from "@/lib/platform";
import { WorldOverviewContent } from "@/components/world-overview-content";
import type { Metadata } from "next";
import { getSdkForOrg } from "@/lib/sdk";

export async function generateMetadata(props: {
  params: Promise<{ organization: string; world: string }>;
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
    if (!organization) return { title: "World Overview" };

    const sdk = getSdkForOrg(organization);
    const world = await sdk.worlds.get(worldSlug);
    if (!world) return { title: "World Overview" };

    return {
      title: {
        absolute: `${world.slug || "World"} | ${organization.slug || "Org"} | Wazoo`,
      },
    };
  } catch {
    return { title: "World Overview" };
  }
}

export default function WorldOverviewPage() {
  return <WorldOverviewContent />;
}
