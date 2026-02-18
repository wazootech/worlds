import { WorldOverviewContent } from "@/components/world-overview-content";
import type { Metadata } from "next";
import { sdk } from "@/lib/sdk";

export async function generateMetadata(props: {
  params: Promise<{ organization: string; world: string }>;
}): Promise<Metadata> {
  const { organization: organizationSlug, world: worldSlug } =
    await props.params;

  try {
    const { getOrganizationManagement } = await import("@/lib/auth");
    const orgMgmt = await getOrganizationManagement();
    const organization = await orgMgmt.getOrganization(organizationSlug);
    if (!organization) return { title: "World Overview" };

    const world = await sdk.worlds.get(worldSlug, {
      organizationId: organization.id,
    });
    if (!world) return { title: "World Overview" };

    const orgSlug = organization.metadata.slug || organization.id;
    const worldSlugTitle = world.slug || world.id;

    return {
      title: {
        absolute: `${worldSlugTitle} | ${orgSlug} | Wazoo`,
      },
    };
  } catch {
    return { title: "World Overview" };
  }
}

export default function WorldOverviewPage() {
  return <WorldOverviewContent />;
}
