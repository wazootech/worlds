import * as authkit from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { ApiKeySection } from "@/components/api-key-section";
import { Metadata } from "next";
import { sdk } from "@/lib/sdk";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default async function AccountPage() {
  const { user } = await authkit.withAuth();

  const workos = authkit.getWorkOS();
  const currentUser = user ? await workos.userManagement.getUser(user.id) : null;

  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }

  const account = await sdk.organizations.get(user.id);
  if (!account) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-stone-50 dark:bg-stone-950 font-sans">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-stone-900 dark:text-stone-50">
            Account Not Found
          </h1>
          <p className="text-stone-600 dark:text-stone-400">
            Your WorkOS user is not associated with a Worlds API account.
          </p>
        </div>
      </div>
    );
  }

  // Check if user is a shadow user - redirect to root if plan is null/undefined or "shadow"
  if (!account.plan || account.plan === "shadow") {
    redirect("/");
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mb-6 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          <span>My Worlds</span>
        </Link>
        <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-8">
          Account
        </h1>

        <div className="bg-white dark:bg-stone-900 shadow rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800">
          <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800">
            <h3 className="text-lg font-medium text-stone-900 dark:text-white">
              Profile Information
            </h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Your account details.
            </p>
          </div>
          <dl className="divide-y divide-stone-200 dark:divide-stone-800">
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-stone-500 dark:text-stone-400">
                Email
              </dt>
              <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100 sm:mt-0 sm:col-span-2">
                {user.email}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-stone-500 dark:text-stone-400">
                User ID
              </dt>
              <dd className="mt-1 text-sm font-mono text-stone-900 dark:text-stone-100 sm:mt-0 sm:col-span-2 break-all">
                {user.id}
              </dd>
            </div>
            {user.firstName && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  First Name
                </dt>
                <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100 sm:mt-0 sm:col-span-2">
                  {user.firstName}
                </dd>
              </div>
            )}
            {user.lastName && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  Last Name
                </dt>
                <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100 sm:mt-0 sm:col-span-2">
                  {user.lastName}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <ApiKeySection apiKey={currentUser?.metadata?.testApiKey as string} />

        <DeleteAccountSection userEmail={user.email} />
      </div>
    </>
  );
}
