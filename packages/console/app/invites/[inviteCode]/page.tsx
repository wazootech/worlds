import * as authkit from "@/lib/auth";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { sdk } from "@/lib/sdk";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

type Params = { inviteCode: string };

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { inviteCode } = await props.params;
  return {
    title: `Invite ${inviteCode}`,
  };
}

function StatusPage({
  title,
  message,
  details,
  isSuccess = false,
}: {
  title: string;
  message: string;
  details?: string;
  isSuccess?: boolean;
}) {
  return (
    <div className="flex flex-1 w-full items-center justify-center p-4 bg-stone-50 dark:bg-stone-950 font-sans min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 shadow-xl rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
        <div className="px-8 py-10 text-center">
          <div
            className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isSuccess
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-3">
            {title}
          </h1>
          <p className="text-stone-600 dark:text-stone-400">{message}</p>
          {details && (
            <p className="text-sm text-stone-500 dark:text-stone-500 mt-2">
              {details}
            </p>
          )}
          {isSuccess && (
            <Link
              href="/"
              className="inline-block mt-6 px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-lg font-semibold hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function InvitePage(props: { params: Promise<Params> }) {
  const { inviteCode } = await props.params;
  const normalizedCode = inviteCode.toUpperCase().trim();

  // Check authentication status
  const { user } = await authkit.withAuth();

  // If not logged in, redirect to sign-in with return path
  if (!user) {
    const currentPath = `/invites/${inviteCode}`;
    redirect(`/sign-in?returnPath=${encodeURIComponent(currentPath)}`);
  }

  // Find invite by code
  const invite = await sdk.invites.get(normalizedCode);

  // Handle invite not found
  if (!invite) {
    return (
      <StatusPage
        title="Invite Not Found"
        message="This invite code is no longer valid or doesn't exist."
      />
    );
  }

  // Handle already redeemed invite
  if (invite.redeemedAt) {
    const redeemedDate = invite.redeemedAt
      ? new Date(invite.redeemedAt).toLocaleDateString()
      : "";
    return (
      <StatusPage
        title="Invite Already Used"
        message="This invite has already been redeemed."
        details={redeemedDate ? `Redeemed on ${redeemedDate}` : undefined}
      />
    );
  }

  // Attempt to redeem the invite
  // Note: The backend API should enforce atomicity to prevent race conditions
  // where multiple users attempt to redeem the same invite simultaneously.
  let redemptionError: Error | null = null;
  try {
    await sdk.invites.redeem(normalizedCode, user.id);
  } catch (error) {
    console.error("Failed to redeem invite:", error);
    // Handle case where invite was redeemed between check and redemption
    const errorMessage =
      error instanceof Error ? error.message : "Failed to redeem invite";
    if (
      errorMessage.includes("already redeemed") ||
      errorMessage.includes("not found")
    ) {
      return (
        <StatusPage
          title="Invite Already Used"
          message="This invite has already been redeemed."
        />
      );
    }
    redemptionError = error instanceof Error ? error : new Error(errorMessage);
  }

  if (redemptionError) {
    return (
      <StatusPage
        title="Redemption Failed"
        message="We encountered an error while redeeming your invite."
        details={redemptionError.message}
      />
    );
  }

  return (
    <StatusPage
      title="Invite Redeemed Successfully"
      message="Your invite has been redeemed. You now have access to Worlds."
      isSuccess={true}
    />
  );
}
