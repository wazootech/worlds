import * as authkit from "@workos-inc/authkit-nextjs";

import { redirect } from "next/navigation";

import { sdk } from "@/lib/sdk";
import { WorldRow } from "@/components/world-row";
import { CreateWorldButton } from "@/components/create-world-button";
import { Metadata } from "next";
import { codeToHtml } from "shiki";
import { ConnectSdkButton } from "@/components/connect-sdk";
import { InviteRedemptionForm } from "@/components/invite-redemption-form";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Home() {
  const { user } = await authkit.withAuth();
  if (!user) {
    const signInUrl = await authkit.getSignInUrl();
    redirect(signInUrl);
  }


  if (!user.id) {
    return (
      <ErrorState
        title="Account Not Found"
        message="Your WorkOS user is not associated with a Worlds API account."
      />
    );
  }

  // Get full user object to access metadata
  const workos = authkit.getWorkOS();
  const currentUser = await workos.userManagement.getUser(user.id);

  let account;
  try {
    account = await sdk.organizations.get(user.id);
  } catch (error) {
    console.error("Failed to fetch account:", error);
    return (
      <ErrorState
        title="Error"
        message="Failed to load account data. Please try again later."
        titleClassName="text-red-600"
      />
    );
  }

  if (!account) {
    redirect("/sign-up");
  }

  // If the account has no plan, show the invite redemption screen
  if (!account.plan) {
    return <InviteRedemptionForm />;
  }

  let worlds;
  try {
    const listResult = await sdk.worlds.list(1, 100, { organizationId: user.id });
    worlds = listResult.toSorted(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
  } catch (error) {
    console.error("Failed to list worlds:", error);
    return (
      <ErrorState
        title="Error Loading Worlds"
        message="Failed to load worlds. Please check your API permissions."
        titleClassName="text-red-600"
      />
    );
  }

  // Generate general SDK snippets for the account
  const apiKey = (currentUser?.metadata?.testApiKey as string) || "YOUR_API_KEY";

  // Generate general SDK snippets for the account
  const codeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  baseUrl: "https://api.wazoo.tech",
  apiKey: "${apiKey}"
});

const worlds = await sdk.worlds.list();
console.log("My worlds:", worlds.length);`;

  const maskedCodeSnippet = `import { WorldsSdk } from "@wazoo/sdk";

const sdk = new WorldsSdk({
  baseUrl: "https://api.wazoo.tech",
  apiKey: "${apiKey}"
});

const worlds = await sdk.worlds.list();
console.log("My worlds:", worlds.length);`;

  const codeSnippetHtml = await codeToHtml(codeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  const maskedCodeSnippetHtml = await codeToHtml(maskedCodeSnippet, {
    lang: "typescript",
    theme: "github-dark",
  });

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
            My Worlds
            <span className="inline-flex items-center rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-800 dark:text-stone-100">
              {worlds.length}
            </span>
          </h1>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <ConnectSdkButton
              codeSnippet={codeSnippet}
              maskedCodeSnippet={maskedCodeSnippet}
              codeSnippetHtml={codeSnippetHtml}
              maskedCodeSnippetHtml={maskedCodeSnippetHtml}
            />
            <CreateWorldButton />
          </div>
        </div>

        {worlds.length === 0
          ? (
            <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-12 text-center bg-stone-50/50 dark:bg-stone-900/50">
              <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                No worlds yet
              </h3>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Get started by creating your first world.
              </p>
              <div className="mt-6">
                <CreateWorldButton />
              </div>
            </div>
          )
          : (
            <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
              <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800">
                <thead className="bg-stone-50 dark:bg-stone-950/50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3 pl-4 pr-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider w-[48px]"
                    >
                      <span className="sr-only">Planet</span>
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider"
                    >
                      World Name
                    </th>
                    <th
                      scope="col"
                      className="hidden md:table-cell py-3 px-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider"
                    >
                      ID
                    </th>
                    <th
                      scope="col"
                      className="hidden md:table-cell py-3 px-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider"
                    >
                      Updated
                    </th>
                    <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900">
                  {worlds.map((world) => (
                    <WorldRow key={world.id} world={world} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </main>
    </>
  );
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
