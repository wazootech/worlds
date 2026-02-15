"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

export function InviteRedemptionForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // const formData = new FormData(event.currentTarget);
    // const code = formData.get("code") as string;

    startTransition(async () => {
      setError(null);
      // Legacy redemption logic removed as internal invites are no longer supported
      setError("Invite redemption is currently managed via external system.");
    });
  };

  return (
    <div className="flex flex-1 w-full items-center justify-center p-4 bg-stone-50 dark:bg-stone-950 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 shadow-xl rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
        <div className="px-8 py-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-3">
              Early Access
            </h1>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
              Enter your invite code to unlock early access to Worlds.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              id="code"
              name="code"
              type="text"
              autoComplete="off"
              required
              className="block w-full rounded-lg border border-stone-300 dark:border-stone-700 px-4 py-3 text-stone-900 dark:text-white bg-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono text-center tracking-widest uppercase text-lg placeholder:text-stone-400 dark:placeholder:text-stone-600"
              placeholder="ABCD"
              maxLength={8}
              pattern="[a-zA-Z0-9]+"
            />

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
                  {error}
                </p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Beta Program Notice
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    By participating in this beta program, you acknowledge that:
                  </p>
                  <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside leading-relaxed">
                    <li>
                      Your data is subject to data loss and may be deleted at
                      any time
                    </li>
                    <li>There are no security guarantees for beta accounts</li>
                    <li>
                      Your usage patterns may be analyzed by engineers to
                      improve the product
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 dark:focus:ring-white"
            >
              {isPending ? "Redeeming..." : "Unlock Access"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
