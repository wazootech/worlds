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
        // Skip if user already has an account.
        const existingAccount = await sdk.accounts.get(data.user.id);
        if (existingAccount) {
          return;
        }

        // Create the account in Worlds API.
        await sdk.accounts.create({
          id: data.user.id, // Associate WorkOS ID with account ID.
        });
      } catch (error) {
        console.error("Error in callback route:", error);
        throw error; // Re-throw to trigger AuthKit error handling.
      }
    },
  })(request);
}
