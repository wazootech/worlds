import fs from "fs/promises";
import path from "path";
import type {
  AuthUser,
  AuthOrganization,
  WorkOSManager,
} from "../workos-manager";

const STATE_FILE = path.join(process.cwd(), "data", "workos.json");

const DEFAULT_USER: AuthUser = {
  id: process.env.LOCAL_USER_ID || "admin",
  email: process.env.LOCAL_USER_EMAIL || "admin@wazoo.dev",
  firstName: process.env.LOCAL_USER_FIRST_NAME || "System",
  lastName: process.env.LOCAL_USER_LAST_NAME || "Admin",
  profilePictureUrl: null,
  metadata: { admin: "true" },
};

function generateId(): string {
  return `org_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export class LocalWorkOSManager implements WorkOSManager {
  private async ensureStateFile() {
    try {
      await fs.access(STATE_FILE);
    } catch {
      await fs.writeFile(
        STATE_FILE,
        JSON.stringify({ user: DEFAULT_USER, organizations: [] }, null, 2),
      );
    }
  }

  private async readState(): Promise<{
    user: AuthUser;
    organizations: AuthOrganization[];
  }> {
    await this.ensureStateFile();
    try {
      const data = await fs.readFile(STATE_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.warn(
        "Failed to read local-state.json, falling back to default:",
        error,
      );
      return { user: { ...DEFAULT_USER }, organizations: [] };
    }
  }

  private async writeState(state: {
    user: AuthUser;
    organizations: AuthOrganization[];
  }): Promise<void> {
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  }

  // --- User Management ---

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUser(userId?: string): Promise<AuthUser> {
    const state = await this.readState();
    return state.user;
  }

  async updateUser(
    userId: string,
    data: {
      metadata?: AuthUser["metadata"];
    },
  ): Promise<AuthUser> {
    const state = await this.readState();
    const user = state.user;
    const updatedUser: AuthUser = {
      ...user,
      metadata: { ...(user.metadata || {}), ...data.metadata },
    };
    state.user = updatedUser;
    await this.writeState(state);
    return updatedUser;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteUser(userId: string): Promise<void> {
    // In local mode, we don't really delete the user, just reset it
    const state = await this.readState();
    state.user = { ...DEFAULT_USER };
    await this.writeState(state);
  }

  async listUsers(): Promise<{
    data: AuthUser[];
    listMetadata?: { before?: string; after?: string };
  }> {
    const state = await this.readState();
    return {
      data: [state.user],
      listMetadata: { before: undefined, after: undefined },
    };
  }

  // --- Organization Management ---

  async getOrganization(orgId: string): Promise<AuthOrganization | null> {
    const state = await this.readState();
    const orgs = state.organizations || [];
    const org = orgs.find((o) => o.id === orgId) ?? null;
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<AuthOrganization | null> {
    const state = await this.readState();
    const orgs = state.organizations || [];
    return orgs.find((o) => o.slug === slug) ?? null;
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
    const state = await this.readState();
    let orgs = state.organizations || [];

    if (options?.order === "desc") {
      orgs.reverse();
    }

    if (options?.after) {
      const index = orgs.findIndex((o) => o.id === options.after);
      if (index !== -1) {
        orgs = orgs.slice(index + 1);
      }
    }

    if (options?.before) {
      const index = orgs.findIndex((o) => o.id === options.before);
      if (index !== -1) {
        orgs = orgs.slice(0, index);
      }
    }

    const limit = options?.limit ?? 10;
    const paginatedOrgs = orgs.slice(0, limit);

    let after: string | undefined;
    let before: string | undefined;

    if (paginatedOrgs.length > 0) {
      const allOrgs = state.organizations || [];
      if (options?.order === "desc") allOrgs.reverse();

      const lastItem = paginatedOrgs[paginatedOrgs.length - 1];
      const firstItem = paginatedOrgs[0];

      const lastIndexInAll = allOrgs.findIndex((o) => o.id === lastItem.id);
      if (lastIndexInAll < allOrgs.length - 1) {
        after = lastItem.id;
      }

      const firstIndexInAll = allOrgs.findIndex((o) => o.id === firstItem.id);
      if (firstIndexInAll > 0) {
        before = firstItem.id;
      }
    }

    return {
      data: paginatedOrgs,
      listMetadata: { before, after },
    };
  }

  async createOrganization(data: {
    name: string;
    slug: string;
    metadata?: {
      apiBaseUrl?: string;
      apiKey?: string;
      [key: string]: string | undefined;
    };
  }): Promise<AuthOrganization> {
    const state = await this.readState();
    const orgs = state.organizations || [];
    const now = new Date().toISOString();
    const org: AuthOrganization = {
      id: generateId(),
      name: data.name,
      createdAt: now,
      updatedAt: now,
      slug: data.slug || slugify(data.name),
      metadata: data.metadata,
    };
    if (!org.slug) org.slug = org.id;
    orgs.push(org);

    state.organizations = orgs;
    await this.writeState(state);

    return org;
  }

  async updateOrganization(
    orgId: string,
    data: { name?: string; slug?: string; metadata?: Record<string, unknown> },
  ): Promise<AuthOrganization> {
    const state = await this.readState();
    const orgs = state.organizations || [];
    const idx = orgs.findIndex((o) => o.id === orgId || o.slug === orgId);
    if (idx === -1) throw new Error(`Organization not found: ${orgId}`);

    const org = orgs[idx];
    if (data.name !== undefined) org.name = data.name;
    if (data.slug !== undefined) org.slug = data.slug;
    if (data.metadata !== undefined) {
      org.metadata = { ...org.metadata, ...data.metadata };
    }
    org.updatedAt = new Date().toISOString();

    orgs[idx] = org;
    state.organizations = orgs;
    await this.writeState(state);
    return org;
  }

  async deleteOrganization(orgId: string): Promise<void> {
    const state = await this.readState();
    const orgs = state.organizations || [];
    const idx = orgs.findIndex((o) => o.id === orgId || o.slug === orgId);
    if (idx === -1) throw new Error(`Organization not found: ${orgId}`);

    orgs.splice(idx, 1);
    state.organizations = orgs;
    await this.writeState(state);
  }
}

export const localWorkOSManager = new LocalWorkOSManager();
