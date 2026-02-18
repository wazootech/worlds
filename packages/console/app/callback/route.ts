import * as authkit from "@/lib/auth";
import { AuthUser } from "@/lib/auth";
import { sdk } from "@/lib/sdk";
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
    await authkit.handleAuth({
      returnPathname: returnPath,
      onSuccess: async (data: { user: AuthUser }) => {
        if (!data.user) {
          return;
        }

        try {
          const orgMgmt = await authkit.getOrganizationManagement();

          // Skip if user already has an organization.
          try {
            const existingOrganization = await orgMgmt.getOrganization(
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

          const newOrg = await orgMgmt.createOrganization({
            name: `${data.user.firstName || "User"}'s Org`,
            slug: slug,
          });

          // Create a default service account for the organization.
          const serviceAccount = await sdk.serviceAccounts.create(newOrg.id, {
            label: "Default",
            description: "Auto-generated for testing",
          });

          // Update WorkOS user metadata.
          const workos = await authkit.getWorkOS();
          await workos.userManagement.updateUser({
            userId: data.user.id,
            metadata: {
              organizationId: newOrg.id,
              testApiKey: serviceAccount.apiKey || null, // Ensure string or null
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
