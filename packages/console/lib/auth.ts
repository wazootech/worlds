import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Detect mode: use WorkOS when credentials are present and not in local mode
// ---------------------------------------------------------------------------
const isLocalDev = !process.env.WORKOS_CLIENT_ID;

// ---------------------------------------------------------------------------
// Local-only imports (lazy)
// ---------------------------------------------------------------------------
let _localUserManagement: import("./user-management").UserManagement | null =
  null;

async function getLocalUserManagement() {
  if (_localUserManagement) return _localUserManagement;
  const { LocalUserManagement } =
    await import("./user-managers/local-user-management");
  _localUserManagement = new LocalUserManagement();
  return _localUserManagement;
}

// ---------------------------------------------------------------------------
// Re-export AuthUser for convenience
// ---------------------------------------------------------------------------
export type { AuthUser } from "./user-management";

// ---------------------------------------------------------------------------
// withAuth – returns the current user session
// ---------------------------------------------------------------------------

interface LocalWithAuthResult {
  user: import("./user-management").AuthUser | null;
}

export async function withAuth(): Promise<LocalWithAuthResult> {
  if (!isLocalDev) {
    const workos = await import("@workos-inc/authkit-nextjs");
    return workos.withAuth();
  }

  const userManagement = await getLocalUserManagement();
  return { user: await userManagement.getUser("local-dev") };
}

// ---------------------------------------------------------------------------
// getInitialAuth – for passing server-side auth data to AuthKitProvider
// ---------------------------------------------------------------------------

export async function getInitialAuth() {
  if (!isLocalDev) {
    try {
      const workos = await import("@workos-inc/authkit-nextjs");
      const auth = await workos.withAuth();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { accessToken, ...initialAuth } = auth;
      return initialAuth;
    } catch {
      // withAuth may fail if middleware hasn't processed the request yet
      return undefined;
    }
  }

  // In local mode, return undefined – AuthKitProvider won't render
  return undefined;
}

// ---------------------------------------------------------------------------
// getSignInUrl / getSignUpUrl
// ---------------------------------------------------------------------------

export async function getSignInUrl(opts?: { state?: string }): Promise<string> {
  if (!isLocalDev) {
    const workos = await import("@workos-inc/authkit-nextjs");
    return workos.getSignInUrl(opts);
  }
  return "/"; // just redirect home
}

export async function getSignUpUrl(): Promise<string> {
  if (!isLocalDev) {
    const workos = await import("@workos-inc/authkit-nextjs");
    return workos.getSignUpUrl();
  }
  return "/"; // just redirect home
}

// ---------------------------------------------------------------------------
// getWorkOS
// ---------------------------------------------------------------------------

export async function getWorkOS() {
  if (!isLocalDev) {
    const workos = await import("@workos-inc/authkit-nextjs");
    return workos.getWorkOS();
  }

  return {
    userManagement: await getLocalUserManagement(),
  };
}

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  if (!isLocalDev) {
    const workos = await import("@workos-inc/authkit-nextjs");
    return workos.signOut();
  }
  // In local mode, sign-out is a no-op.
}

// ---------------------------------------------------------------------------
// handleAuth
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleAuth(opts?: any): Promise<any> {
  if (!isLocalDev) {
    const workos = await import("@workos-inc/authkit-nextjs");
    return workos.handleAuth(opts);
  }

  // Return a handler that just redirects to the return path
  return () => {
    const returnPathname = opts?.returnPathname || "/";
    return NextResponse.redirect(
      new URL(returnPathname, "http://localhost:3000"),
    );
  };
}
