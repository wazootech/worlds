import { AuthUser, UserManagement } from "@/lib/user-management";
import fs from "node:fs";
import path from "node:path";

const USER_JSON_PATH = path.join(process.cwd(), "user.json");

const DEFAULT_USER: AuthUser = {
  id: process.env.LOCAL_USER_ID || "local-dev-user",
  email: process.env.LOCAL_USER_EMAIL || "dev@localhost",
  firstName: process.env.LOCAL_USER_FIRST_NAME || "Local",
  lastName: process.env.LOCAL_USER_LAST_NAME || "Developer",
  profilePictureUrl: null,
  metadata: { admin: "true" },
};

export class LocalUserManagement implements UserManagement {
  private ensureUserJson() {
    if (!fs.existsSync(USER_JSON_PATH)) {
      fs.writeFileSync(USER_JSON_PATH, JSON.stringify(DEFAULT_USER, null, 2));
    }
  }

  private readUserJson(): AuthUser {
    this.ensureUserJson();
    try {
      const data = fs.readFileSync(USER_JSON_PATH, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.warn("Failed to read user.json, falling back to default:", error);
      return { ...DEFAULT_USER };
    }
  }

  private writeUserJson(user: AuthUser) {
    fs.writeFileSync(USER_JSON_PATH, JSON.stringify(user, null, 2));
  }

  async getUser(): Promise<AuthUser> {
    return this.readUserJson();
  }

  async updateUser(opts: {
    userId: string;
    metadata?: AuthUser["metadata"];
  }): Promise<AuthUser> {
    const user = this.readUserJson();
    const updatedUser: AuthUser = {
      ...user,
      metadata: { ...(user.metadata || {}), ...opts.metadata },
    };
    this.writeUserJson(updatedUser);
    return updatedUser;
  }

  async deleteUser(): Promise<void> {
    if (fs.existsSync(USER_JSON_PATH)) {
      fs.unlinkSync(USER_JSON_PATH);
    }
  }

  async listUsers(): Promise<{
    data: AuthUser[];
    listMetadata?: { after?: string };
  }> {
    return { data: [this.readUserJson()], listMetadata: {} };
  }
}
