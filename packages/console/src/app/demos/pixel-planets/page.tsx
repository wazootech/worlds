import { PlanetDemoPage } from "@/components/planet-demo-page";
import { Metadata } from "next";
import * as authkit from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";

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

  const isAdmin = !!user?.metadata?.admin;

  // ... (shadow check remains)

  return (
    <>
      <PageHeader user={user} isAdmin={isAdmin} />
      <PlanetDemoPage />
    </>
  );
}
