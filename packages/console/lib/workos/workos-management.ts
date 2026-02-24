// ── Shared Types ───────────────────────────────────────────────────────────

export interface AuthUser {
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

export interface AuthOrganization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  slug: string;
  metadata?: {
    apiBaseUrl?: string;
    apiKey?: string;
    libsqlUrl?: string;
    libsqlAuthToken?: string;
    tursoApiToken?: string;
    tursoOrg?: string;
    denoDeployAppId?: string;
    denoDeployAppSlug?: string;
  };
}

// ── WorkOSManagement Interface ─────────────────────────────────────────────

export interface WorkOSManagement {
  // User Management
  getUser(userId: string): Promise<AuthUser>;
  updateUser(opts: {
    userId: string;
    metadata?: AuthUser["metadata"];
  }): Promise<AuthUser>;
  deleteUser(userId: string): Promise<void>;
  listUsers(opts?: {
    limit?: number;
    before?: string;
    after?: string;
    order?: "asc" | "desc";
  }): Promise<{
    data: AuthUser[];
    listMetadata?: { after?: string };
  }>;

  // Organization Management
  getOrganization(orgId: string): Promise<AuthOrganization | null>;
  getOrganizationBySlug(slug: string): Promise<AuthOrganization | null>;
  listOrganizations(options?: {
    limit?: number;
    before?: string;
    after?: string;
    order?: "asc" | "desc";
  }): Promise<{
    data: AuthOrganization[];
    listMetadata?: { before?: string; after?: string };
  }>;
  createOrganization(data: {
    name: string;
    slug: string;
    metadata?: AuthOrganization["metadata"];
  }): Promise<AuthOrganization>;
  updateOrganization(
    orgId: string,
    data: {
      name?: string;
      slug?: string;
      metadata?: AuthOrganization["metadata"];
    },
  ): Promise<AuthOrganization>;
  deleteOrganization(orgId: string): Promise<void>;
}
