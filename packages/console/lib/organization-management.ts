export interface AuthOrganization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    slug: string;
  };
}

export interface OrganizationManagement {
  getOrganization(orgId: string): Promise<AuthOrganization | null>;
  listOrganizations(): Promise<AuthOrganization[]>;
  createOrganization(data: {
    name: string;
    slug: string;
  }): Promise<AuthOrganization>;
  updateOrganization(
    orgId: string,
    data: { name?: string; slug?: string },
  ): Promise<AuthOrganization>;
  deleteOrganization(orgId: string): Promise<void>;
}
