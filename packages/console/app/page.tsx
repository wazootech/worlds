import { withAuth, getSignInUrl, getSignUpUrl } from "@/lib/auth";
import { getWorkOS } from "@/lib/platform";
import { PageHeader } from "@/components/page-header";

import { redirect } from "next/navigation";

import { CreateOrganizationForm } from "@/components/create-organization-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Worlds",
};

export default async function Home(props: {
  searchParams: Promise<{ new?: string }>;
}) {
  const searchParams = await props.searchParams;
  const isCreatingNew = searchParams.new === "true";
  const userInfo = await withAuth();
  const isAdmin = !!userInfo?.user?.metadata?.admin;

  if (userInfo.user && !isCreatingNew) {
    const organizationId = userInfo.user.metadata?.activeOrganizationId as
      | string
      | undefined;
    if (organizationId) {
      let organizationToRedirect;
      try {
        const workos = await getWorkOS();
        organizationToRedirect = await workos.getOrganization(organizationId);
      } catch (e) {
        console.error("Failed to fetch organization for early redirect:", e);
      }
      if (organizationToRedirect) {
        redirect(`/organizations/${organizationToRedirect.slug}`);
      }
    }
  }

  if (!userInfo.user?.id) {
    // WorkOS mode: user is not signed in — show landing page
    if (process.env.WORKOS_CLIENT_ID) {
      const signInUrl = await getSignInUrl();
      const signUpUrl = await getSignUpUrl();

      return (
        <>
          <nav className="sticky top-0 z-50 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="relative w-6 h-6 rounded-full overflow-hidden shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/wazoo.svg"
                    alt="Wazoo Logo"
                    className="w-full h-full object-cover logo-image p-0.5"
                  />
                </div>
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Wazoo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={signInUrl}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors"
                >
                  Log in
                </a>
                <a
                  href={signUpUrl}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                >
                  Sign up
                </a>
              </div>
            </div>
          </nav>
          <main className="flex-1 flex items-center justify-center p-6 bg-stone-50 dark:bg-stone-950">
            <div className="w-full max-w-xl">
              <div className="relative overflow-hidden rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl p-8 md:p-12">
                {/* Background Decorative Elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-stone-100 dark:bg-stone-800 rounded-full blur-3xl opacity-50 pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-100 dark:bg-amber-900/20 rounded-full blur-3xl opacity-40 pointer-events-none" />

                <div className="relative flex flex-col items-center text-center space-y-8">
                  {/* Logo */}
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/wazoo.svg"
                      alt="Wazoo Logo"
                      className="h-12 w-12 object-contain logo-image"
                    />
                  </div>

                  {/* Heading */}
                  <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
                      Welcome to Wazoo
                    </h1>
                    <p className="max-w-md mx-auto text-lg text-stone-500 dark:text-stone-400">
                      Sign in to start building, managing, and exploring your
                      Worlds.
                    </p>
                  </div>

                  {/* CTA Buttons */}
                  <div className="w-full space-y-3 pt-2">
                    <a
                      href={signInUrl}
                      className="group relative w-full flex items-center justify-center overflow-hidden rounded-2xl bg-stone-900 dark:bg-white px-8 py-4 text-lg font-semibold text-white dark:text-stone-900 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                    >
                      Log in
                    </a>
                    <a
                      href={signUpUrl}
                      className="group relative w-full flex items-center justify-center overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-8 py-4 text-lg font-semibold text-stone-700 dark:text-stone-300 transition-all hover:scale-[1.02] hover:bg-stone-100 dark:hover:bg-stone-700 active:scale-[0.98]"
                    >
                      Create an account
                    </a>
                  </div>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm font-medium text-stone-400 dark:text-stone-500">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Unlimited Worlds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                      <span>Full API Access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span>Enterprise Security</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </>
      );
    }

    // Local dev mode: user should always exist
    return (
      <ErrorState
        title="Account Not Found"
        message="Your local user is not initialized correctly."
      />
    );
  }

  let organization = null;
  if (!isCreatingNew) {
    try {
      const organizationId = userInfo.user.metadata?.activeOrganizationId as
        | string
        | undefined;
      if (organizationId) {
        const workos = await getWorkOS();
        organization = await workos.getOrganization(organizationId);
      }
    } catch (error) {
      console.error("Failed to fetch organization:", error);
    }
  }

  if (!organization) {
    return (
      <>
        <PageHeader user={userInfo.user} isAdmin={isAdmin} />
        <CreateOrganizationForm />
      </>
    );
  }

  // Redirect to the actual organization dashboard using slug
  redirect(`/organizations/${organization.slug}`);
}

function ErrorState({
  title,
  message,
  titleClassName = "text-stone-900 dark:text-stone-50",
}: {
  title: string;
  message: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-stone-50 dark:bg-stone-950 font-sans">
      <div className="text-center">
        <h1 className={`text-xl font-bold mb-2 ${titleClassName}`}>{title}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">{message}</p>
      </div>
    </div>
  );
}
