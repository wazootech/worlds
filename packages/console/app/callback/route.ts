import * as authkit from "@workos-inc/authkit-nextjs";
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

  return await authkit.handleAuth({
    returnPathname: returnPath,
    onSuccess: async (data) => {
      if (!data.user) {
        return;
      }

      try {
        // Skip if user already has an organization.
        const existingAccount = await sdk.organizations.get(data.user.id);
        if (existingAccount) {
          return;
        }

        // Create the organization in Worlds API.
        await sdk.organizations.create({
          id: data.user.id, // Associate WorkOS ID with organization ID.
          label: `${data.user.firstName}'s Org`, // Default label
        });

        // Create a default service account for the organization.
        const serviceAccount = await sdk.organizations.serviceAccounts.create(
          data.user.id,
          {
            label: "Default",
            description: "Auto-generated for testing",
          },
        );

        // Update WorkOS user metadata.
        const workos = authkit.getWorkOS();
        await workos.userManagement.updateUser({
          userId: data.user.id,
          metadata: {
            organizationId: data.user.id,
            testApiKey: serviceAccount.apiKey,
          },
        });
      } catch (error) {
        console.error("Error in callback route:", error);
        throw error; // Re-throw to trigger AuthKit error handling.
      }
    },
  })(request);
}
