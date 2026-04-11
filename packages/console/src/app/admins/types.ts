export type WorkOSUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};
