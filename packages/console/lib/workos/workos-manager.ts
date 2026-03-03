// ── Shared Types ───────────────────────────────────────────────────────────

export interface WorkOSUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl?: string | null;
  metadata?: {
    activeOrganizationId?: string | null;
    admin?: string | null;
  };
}

export interface WorkOSOrganization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  slug: string;
  metadata?: {
    // Safe for members to see.
    apiBaseUrl?: string;
    apiKey?: string;

    // Sensitive: security risk if exposed!
    libsqlUrl?: string;
    libsqlAuthToken?: string;
    tursoApiToken?: string;
    tursoOrg?: string;
    denoDeployAppId?: string;
    openRouterApiKey?: string;
  };
}

// ── WorkOSManager Interface ─────────────────────────────────────────────

export interface WorkOSManager {
  // User Management
  getUser(userId: string): Promise<WorkOSUser>;
  updateUser(
    userId: string,
    data: {
      metadata?: WorkOSUser["metadata"];
    },
  ): Promise<WorkOSUser>;
  deleteUser(userId: string): Promise<void>;
  listUsers(opts?: {
    limit?: number;
    before?: string;
    after?: string;
    order?: "asc" | "desc";
  }): Promise<{
    data: WorkOSUser[];
    listMetadata?: { before?: string; after?: string };
  }>;

  // Organization Management
  getOrganization(orgId: string): Promise<WorkOSOrganization | null>;
  getOrganizationBySlug(slug: string): Promise<WorkOSOrganization | null>;
  listOrganizations(options?: {
    limit?: number;
    before?: string;
    after?: string;
    order?: "asc" | "desc";
  }): Promise<{
    data: WorkOSOrganization[];
    listMetadata?: { before?: string; after?: string };
  }>;
  createOrganization(data: {
    name: string;
    slug: string;
    metadata?: WorkOSOrganization["metadata"];
  }): Promise<WorkOSOrganization>;
  updateOrganization(
    orgId: string,
    data: {
      name?: string;
      slug?: string;
      metadata?: WorkOSOrganization["metadata"];
    },
  ): Promise<WorkOSOrganization>;
  deleteOrganization(orgId: string): Promise<void>;

  // Membership Management
  createOrganizationMembership(data: {
    organizationId: string;
    userId: string;
    role?: string;
  }): Promise<void>;

  listOrganizationMemberships(opts: {
    userId: string;
  }): Promise<{ data: { organizationId: string }[] }>;
}
