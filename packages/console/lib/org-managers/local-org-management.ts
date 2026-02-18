import fs from "fs/promises";
import path from "path";
import type {
  AuthOrganization,
  OrganizationManagement,
} from "../organization-management";

const ORGS_FILE = path.join(process.cwd(), "organizations.json");

function generateId(): string {
  return `org_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export class LocalOrganizationManagement implements OrganizationManagement {
  private orgs: AuthOrganization[] | null = null;

  private async load(): Promise<AuthOrganization[]> {
    if (this.orgs) return this.orgs;

    try {
      const data = await fs.readFile(ORGS_FILE, "utf-8");
      this.orgs = JSON.parse(data) as AuthOrganization[];
    } catch {
      // Seed with a default organization
      const now = new Date().toISOString();
      this.orgs = [
        {
          id: "org_default",
          name: process.env.LOCAL_ORG_NAME || "My Organization",
          createdAt: now,
          updatedAt: now,
          metadata: {
            slug: process.env.LOCAL_ORG_SLUG || "my-org",
          },
        },
      ];
      await this.save();
    }

    return this.orgs;
  }

  private async save(): Promise<void> {
    await fs.writeFile(ORGS_FILE, JSON.stringify(this.orgs, null, 2), "utf-8");
  }

  async getOrganization(orgId: string): Promise<AuthOrganization | null> {
    const orgs = await this.load();
    return (
      orgs.find((o) => o.id === orgId || o.metadata.slug === orgId) ?? null
    );
  }

  async listOrganizations(): Promise<AuthOrganization[]> {
    return this.load();
  }

  async createOrganization(data: {
    name: string;
    slug?: string;
  }): Promise<AuthOrganization> {
    const orgs = await this.load();
    const now = new Date().toISOString();
    const org: AuthOrganization = {
      id: generateId(),
      name: data.name,
      createdAt: now,
      updatedAt: now,
      metadata: {
        slug: data.slug || slugify(data.name),
      },
    };
    orgs.push(org);
    await this.save();
    return org;
  }

  async updateOrganization(
    orgId: string,
    data: { name?: string; slug?: string },
  ): Promise<AuthOrganization> {
    const orgs = await this.load();
    const idx = orgs.findIndex(
      (o) => o.id === orgId || o.metadata.slug === orgId,
    );
    if (idx === -1) throw new Error(`Organization not found: ${orgId}`);

    const org = orgs[idx];
    if (data.name !== undefined) org.name = data.name;
    if (data.slug !== undefined) org.metadata.slug = data.slug;
    org.updatedAt = new Date().toISOString();

    orgs[idx] = org;
    await this.save();
    return org;
  }

  async deleteOrganization(orgId: string): Promise<void> {
    const orgs = await this.load();
    const idx = orgs.findIndex(
      (o) => o.id === orgId || o.metadata.slug === orgId,
    );
    if (idx === -1) throw new Error(`Organization not found: ${orgId}`);

    orgs.splice(idx, 1);
    this.orgs = orgs;
    await this.save();
  }
}
