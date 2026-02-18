import type {
  AuthOrganization,
  OrganizationManagement,
} from "../organization-management";

/**
 * WorkOS-backed organization management.
 *
 * Uses the WorkOS Node SDK to manage organizations.
 * This implementation will be filled in when WorkOS integration is enabled.
 */
export class WorkOSOrganizationManagement implements OrganizationManagement {
  async getOrganization(orgId: string): Promise<AuthOrganization | null> {
    const { WorkOS } = await import("@workos-inc/node");
    const workos = new WorkOS(process.env.WORKOS_API_KEY!);
    try {
      const org = await workos.organizations.getOrganization(orgId);
      return mapWorkOSOrg(org);
    } catch {
      return null;
    }
  }

  async listOrganizations(): Promise<AuthOrganization[]> {
    const { WorkOS } = await import("@workos-inc/node");
    const workos = new WorkOS(process.env.WORKOS_API_KEY!);
    const result = await workos.organizations.listOrganizations();
    return result.data.map(mapWorkOSOrg);
  }

  async createOrganization(data: {
    name: string;
    slug?: string;
  }): Promise<AuthOrganization> {
    const { WorkOS } = await import("@workos-inc/node");
    const workos = new WorkOS(process.env.WORKOS_API_KEY!);
    const org = await workos.organizations.createOrganization({
      name: data.name,
    });
    return mapWorkOSOrg(org);
  }

  async updateOrganization(
    orgId: string,
    data: { name?: string; slug?: string },
  ): Promise<AuthOrganization> {
    const { WorkOS } = await import("@workos-inc/node");
    const workos = new WorkOS(process.env.WORKOS_API_KEY!);
    const org = await workos.organizations.updateOrganization({
      organization: orgId,
      name: data.name,
    });
    return mapWorkOSOrg(org);
  }

  async deleteOrganization(orgId: string): Promise<void> {
    const { WorkOS } = await import("@workos-inc/node");
    const workos = new WorkOS(process.env.WORKOS_API_KEY!);
    await workos.organizations.deleteOrganization(orgId);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkOSOrg(org: any): AuthOrganization {
  return {
    id: org.id,
    name: org.name,
    createdAt: org.createdAt ?? org.created_at ?? new Date().toISOString(),
    updatedAt: org.updatedAt ?? org.updated_at ?? new Date().toISOString(),
    metadata: {
      slug: org.slug ?? org.id,
    },
  };
}
