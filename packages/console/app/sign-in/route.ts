import { getSignInUrl } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnPath = searchParams.get("returnPath");

  // Store return path in a cookie if provided
  if (returnPath) {
    (await cookies()).set("auth_return_path", returnPath, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes
    });
  }

  const signInUrl = await getSignInUrl();
  redirect(signInUrl);
}
