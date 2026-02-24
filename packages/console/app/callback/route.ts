import { handleAuth, type AuthUser } from "@/lib/auth";
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
      onSuccess: async (data: { user: AuthUser }) => {
        if (!data.user) {
          return;
        }

        try {
          const workos = await getWorkOS();

          // Skip if user already has an organization.
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

          // Update WorkOS user metadata.
          await workos.updateUser({
            userId: data.user.id,
            metadata: {
              activeOrganizationId: newOrg.id,
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
