/**
 * AuthUser is an interface for a user.
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl?: string | null;
  metadata?: {
    organizationId?: string | null;
    testApiKey?: string | null;
    admin?: string | null;
    // [key: string]: string | undefined;
  };
}

/**
 * UserManagement is an interface for managing users.
 */
export interface UserManagement {
  /**
   * getUser returns a user by their ID.
   */
  getUser(userId: string): Promise<AuthUser>;

  /**
   * updateUser updates a user by their ID.
   */
  updateUser(opts: {
    userId: string;
    metadata?: AuthUser["metadata"];
  }): Promise<AuthUser>;

  /**
   * deleteUser deletes a user by their ID.
   */
  deleteUser(userId: string): Promise<void>;

  /**
   * listUsers lists users.
   */
  listUsers(opts?: Record<string, unknown>): Promise<{
    data: AuthUser[];
    listMetadata?: { after?: string };
  }>;
}
