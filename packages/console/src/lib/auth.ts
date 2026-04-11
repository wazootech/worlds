import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLocalDev, getWorkOS } from "./platform";

// ---------------------------------------------------------------------------
// Re-export WorkOSUser & WorkOSOrganization for convenience
// ---------------------------------------------------------------------------
export type { WorkOSUser, WorkOSOrganization } from "./workos/workos-manager";

export const GUEST_USER_ID = "guest-user";

export const GUEST_MODE_COOKIE = "worlds_guest_mode";
export const CLAIMABLE_ORG_COOKIE = "claimable_org_id";

export const GUEST_USER = {
  id: GUEST_USER_ID,
  email: "guest@wazoo.dev",
  firstName: "Guest",
  lastName: "Visitor",
  profilePictureUrl: null,
  metadata: {
    activeOrganizationId: null,
  },
};

// ---------------------------------------------------------------------------
// withAuth – returns the current user session
// ---------------------------------------------------------------------------

interface LocalWithAuthResult {
  user: import("./workos/workos-manager").WorkOSUser | null;
}

export async function withAuth(): Promise<LocalWithAuthResult> {
  // 1. Check for Guest Mode
  const guestAuth = await getGuestAuth();
  if (guestAuth) return guestAuth;

  // 2. Normal Auth logic
  if (!isLocalDev) {
    const workos = await import("@workos-inc/authkit-nextjs");
    return workos.withAuth();
  }

  const workos = await getWorkOS();
  return { user: await workos.getUser("admin") };
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

// ---------------------------------------------------------------------------
// Guest Mode Helpers
// ---------------------------------------------------------------------------

export async function enableGuestMode(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_MODE_COOKIE, "true", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  cookieStore.set(CLAIMABLE_ORG_COOKIE, orgId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function disableGuestMode() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_MODE_COOKIE);
  cookieStore.delete(CLAIMABLE_ORG_COOKIE);
}

export async function getClaimableOrgId() {
  const cookieStore = await cookies();
  return cookieStore.get(CLAIMABLE_ORG_COOKIE)?.value;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

async function getGuestAuth(): Promise<LocalWithAuthResult | null> {
  const cookieStore = await cookies();
  const guestMode = cookieStore.get(GUEST_MODE_COOKIE);
  const claimableOrgId = cookieStore.get(CLAIMABLE_ORG_COOKIE)?.value;

  if (guestMode?.value === "true") {
    if (!claimableOrgId) {
      console.warn("[auth] Guest mode active but claimable_org_id missing");
      return { user: null };
    }

    return {
      user: {
        ...GUEST_USER,
        metadata: {
          ...GUEST_USER.metadata,
          activeOrganizationId: claimableOrgId,
        },
      },
    };
  }

  return null;
}
