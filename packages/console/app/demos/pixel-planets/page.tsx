import { PlanetDemoPage } from "@/components/planet-demo-page";
import { Metadata } from "next";
import * as authkit from "@/lib/auth";
import { redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";

export const metadata: Metadata = {
  title: "Pixel Planets Demo",
  description:
    "Procedurally generated planets using React Three Fiber and shaders.",
};

export default async function Page() {
  const { user } = await authkit.withAuth();

  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  // Check if user is a shadow user - redirect to root if plan is null/undefined or "shadow"
  try {
    const account = await sdk.organizations.get(user.id);
    if (account && (!account.plan || account.plan === "shadow")) {
      redirect("/");
    }
  } catch (error) {
    console.error("Failed to fetch account for shadow user check:", error);
    redirect("/");
  }
  return <PlanetDemoPage />;
}
