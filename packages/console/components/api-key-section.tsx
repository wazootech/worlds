"use client";

import { useState, useTransition } from "react";
import { rotateApiKey } from "@/app/actions";

export function ApiKeySection({ apiKey: initialApiKey }: { apiKey?: string }) {
  const [apiKey, setApiKey] = useState(initialApiKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRotate = () => {
    if (!confirmRotate) {
      setConfirmRotate(true);
      setTimeout(() => setConfirmRotate(false), 3000);
      return;
    }

    startTransition(async () => {
      const newKey = await rotateApiKey();
      setApiKey(newKey);
      setConfirmRotate(false);
      setShowKey(true);
    });
  };

  return (
    <div
      id="api-keys"
      className="mt-8 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm"
    >
      <h3 className="text-lg font-medium text-stone-900 dark:text-white">
        API Key
      </h3>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Your API key carries full access to your account. Keep it secret and
        never share it in public repositories or client-side code.
      </p>

      <div className="mt-4 flex items-center space-x-2">
        <div className="flex-1 relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            readOnly
            className="w-full rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm font-code text-stone-900 dark:text-stone-100 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowKey(!showKey)}
          className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
          title={showKey ? "Hide key" : "Show key"}
        >
          {showKey
            ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            )
            : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12.067a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            )}
        </button>
        <button
          onClick={handleCopy}
          className={`p-2 rounded-md transition-colors cursor-pointer ${
            isCopied
              ? "text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/10"
              : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title="Copy to clipboard"
        >
          {isCopied
            ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            )
            : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5"
                />
              </svg>
            )}
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400">
              Rotate API Key
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Immediately invalidate the current key and generate a new one.
            </p>
          </div>
          <button
            onClick={handleRotate}
            disabled={isPending}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
              confirmRotate
                ? "bg-red-600 text-white hover:bg-red-700"
                : "text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/10"
            } disabled:opacity-50`}
          >
            {isPending
              ? "Rotating..."
              : confirmRotate
              ? "Confirm Rotation"
              : "Rotate Key"}
          </button>
        </div>
      </div>
    </div>
  );
}
