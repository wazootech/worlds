import { NextResponse } from "next/server";
import { isLocalDev, getWorkOS } from "./platform";

// ---------------------------------------------------------------------------
// Re-export AuthUser & AuthOrganization for convenience
// ---------------------------------------------------------------------------
export type { AuthUser, AuthOrganization } from "./workos/workos-manager";

// ---------------------------------------------------------------------------
// withAuth – returns the current user session
// ---------------------------------------------------------------------------

interface LocalWithAuthResult {
  user: import("./workos/workos-manager").AuthUser | null;
}

export async function withAuth(): Promise<LocalWithAuthResult> {
  if (!isLocalDev) {
    const workos = await import("@workos-inc/authkit-nextjs");
    return workos.withAuth();
  }

  const workos = await getWorkOS();
  return { user: await workos.getUser("local-dev") };
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
