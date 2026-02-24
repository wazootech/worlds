import { WorkOS, Organization } from "@workos-inc/node";
import type {
  AuthUser,
  AuthOrganization,
  WorkOSManager,
} from "./workos-manager";

function mapWorkOSOrg(org: Organization): AuthOrganization {
  if (!org.externalId) {
    throw new Error("Organization externalId is missing");
  }

  return {
    id: org.id,
    name: org.name,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    slug: org.externalId,
    metadata: org.metadata,
  };
}

export class RemoteWorkOSManager implements WorkOSManager {
  private readonly workos: WorkOS;

  constructor() {
    if (!process.env.WORKOS_API_KEY) {
      throw new Error("WORKOS_API_KEY is missing");
    }

    this.workos = new WorkOS(process.env.WORKOS_API_KEY);
  }

  // User Management
  async getUser(userId: string): Promise<AuthUser> {
    return this.workos.userManagement.getUser(userId);
  }

  async updateUser(
    userId: string,
    data: {
      metadata?: AuthUser["metadata"];
    },
  ): Promise<AuthUser> {
    return this.workos.userManagement.updateUser({
      userId,
      metadata: data.metadata as Record<string, string | null>,
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return this.workos.userManagement.deleteUser(userId);
  }

  async listUsers(opts?: {
    limit?: number;
    before?: string;
    after?: string;
    order?: "asc" | "desc";
  }): Promise<{
    data: AuthUser[];
    listMetadata?: { before?: string; after?: string };
  }> {
    return this.workos.userManagement.listUsers(opts);
  }

  // Organization Management
  async getOrganization(orgId: string): Promise<AuthOrganization | null> {
    try {
      const org = await this.workos.organizations.getOrganization(orgId);
      return mapWorkOSOrg(org);
    } catch {
      return null;
    }
  }

  async getOrganizationBySlug(slug: string): Promise<AuthOrganization | null> {
    try {
      const org =
        await this.workos.organizations.getOrganizationByExternalId(slug);
      return mapWorkOSOrg(org);
    } catch {
      return null;
    }
  }

  async listOrganizations(options?: {
    limit?: number;
    before?: string;
    after?: string;
    order?: "asc" | "desc";
  }): Promise<{
    data: AuthOrganization[];
    listMetadata?: { before?: string; after?: string };
  }> {
    const result = await this.workos.organizations.listOrganizations(options);
    return {
      data: result.data.map(mapWorkOSOrg),
      listMetadata: result.listMetadata,
    };
  }

  async createOrganization(data: {
    name: string;
    slug: string;
    metadata?: AuthOrganization["metadata"];
  }): Promise<AuthOrganization> {
    const org = await this.workos.organizations.createOrganization({
      name: data.name,
      externalId: data.slug,
      metadata: data.metadata as Record<string, string>,
    });

    return mapWorkOSOrg(org);
  }

  async updateOrganization(
    orgId: string,
    data: {
      name?: string;
      slug?: string;
      metadata?: AuthOrganization["metadata"];
    },
  ): Promise<AuthOrganization> {
    const org = await this.workos.organizations.updateOrganization({
      organization: orgId,
      name: data.name,
      externalId: data.slug,
      metadata: data.metadata as Record<string, string>,
    });
    return mapWorkOSOrg(org);
  }

  async deleteOrganization(orgId: string): Promise<void> {
    await this.workos.organizations.deleteOrganization(orgId);
  }
}
