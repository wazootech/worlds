import {
  handleAuth,
  type WorkOSUser,
  GUEST_MODE_COOKIE,
  CLAIMABLE_ORG_COOKIE,
} from "@/lib/auth";
import { getWorkOS, provisionOrganization } from "@/lib/platform";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const returnPath = cookieStore.get("auth_return_path")?.value || "/";

  // Delete the cookie immediately after reading
  if (cookieStore.get("auth_return_path")) {
    cookieStore.delete("auth_return_path");
  }

  // Create a handler with the return path

  return await (
    await handleAuth({
      returnPathname: returnPath,
      onSuccess: async (data: { user: WorkOSUser }) => {
        if (!data.user) {
          return;
        }

        try {
          const workos = await getWorkOS();

          // 1. Check if user is claiming a guest organization
          const claimableOrgId = cookieStore.get(CLAIMABLE_ORG_COOKIE)?.value;

          if (claimableOrgId) {
            console.log(
              `[callback] User ${data.user.id} is claiming org ${claimableOrgId}`,
            );

            // Add user to the existing organization
            await workos.createOrganizationMembership({
              organizationId: claimableOrgId,
              userId: data.user.id,
            });

            // Update user's active organization and grant admin status
            await workos.updateUser(data.user.id, {
              metadata: {
                activeOrganizationId: claimableOrgId,
                admin: "true",
              },
            });

            // Clear guest cookies
            cookieStore.delete(GUEST_MODE_COOKIE);
            cookieStore.delete(CLAIMABLE_ORG_COOKIE);

            return;
          }

          // 2. Normal flow: Skip if user already has an organization.
          try {
            const existingOrganization = await workos.getOrganization(
              data.user.id,
            );
            if (existingOrganization) {
              return;
            }
          } catch {
            // Organization not found, proceed to create
          }

          // Create the organization.
          const slug = data.user.firstName
            ? data.user.firstName.toLowerCase().replace(/\s+/g, "-")
            : data.user.id; // Fallback to ID if no name

          const newOrg = await workos.createOrganization({
            name: `${data.user.firstName || "User"}'s Org`,
            slug: slug,
          });

          // Provision platform resources (API key, Turso DB, deployment)
          try {
            await provisionOrganization(newOrg.id);
          } catch (e) {
            console.error("Failed to provision newly created organization", e);
          }

          // Update WorkOS user metadata with active organization and admin status.
          await workos.updateUser(data.user.id, {
            metadata: {
              activeOrganizationId: newOrg.id,
              admin: "true",
            },
          });
        } catch (error) {
          console.error("Error in callback route:", error);
          throw error; // Re-throw to trigger AuthKit error handling.
        }
      },
    })
  )(request);
}
