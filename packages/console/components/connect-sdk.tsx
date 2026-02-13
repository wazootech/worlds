"use client";

import { useState } from "react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { DialogCloseButton } from "@/components/ui/dialog-close-button";

export function ConnectSdkButton({
  codeSnippet,
  maskedCodeSnippet,
  codeSnippetHtml,
  maskedCodeSnippetHtml,
}: {
  codeSnippet: string;
  maskedCodeSnippet: string;
  codeSnippetHtml: string;
  maskedCodeSnippetHtml: string;
}) {
  const [isOpen, setIsOpen] = useQueryState(
    "connect",
    parseAsBoolean.withDefault(false),
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex w-full sm:w-auto justify-center items-center space-x-2 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer shadow-sm"
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
            d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
          />
        </svg>
        <span>Connect</span>
      </button>

      {isOpen && (
        <ConnectSdkDialog
          codeSnippet={codeSnippet}
          maskedCodeSnippet={maskedCodeSnippet}
          codeSnippetHtml={codeSnippetHtml}
          maskedCodeSnippetHtml={maskedCodeSnippetHtml}
          onClose={() => setIsOpen(null)}
        />
      )}
    </>
  );
}

function ConnectSdkDialog({
  codeSnippet,
  maskedCodeSnippet,
  codeSnippetHtml,
  maskedCodeSnippetHtml,
  onClose,
}: {
  codeSnippet: string;
  maskedCodeSnippet: string;
  codeSnippetHtml: string;
  maskedCodeSnippetHtml: string;
  onClose: () => void;
}) {
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [installTab, setInstallTab] = useState<"npm" | "deno">("npm");

  const installCommand =
    installTab === "npm" ? "npx jsr add @wazoo/sdk" : "deno add jsr:@wazoo/sdk";

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200 text-stone-900 dark:text-stone-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200 dark:border-stone-800"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">
            Connect via SDK
          </h2>
          <DialogCloseButton onClick={onClose} variant="inline" />
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Installation */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              1. Install the SDK
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Run this command in your project terminal.
              <br />
              <span className="text-xs italic text-stone-500">
                Please reference{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary dark:text-primary-light hover:underline cursor-pointer"
                  href="https://jsr.io/@wazoo/sdk"
                >
                  jsr.io/@wazoo/sdk
                </a>{" "}
                for more details.
              </span>
            </p>

            <div className="flex items-center space-x-4 border-b border-stone-200 dark:border-stone-700 mb-2">
              <button
                onClick={() => setInstallTab("npm")}
                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  installTab === "npm"
                    ? "border-primary text-primary dark:text-primary-light dark:border-primary-light"
                    : "border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                NPM
              </button>
              <button
                onClick={() => setInstallTab("deno")}
                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  installTab === "deno"
                    ? "border-primary text-primary dark:text-primary-light dark:border-primary-light"
                    : "border-transparent text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                Deno
              </button>
            </div>

            <div className="relative group">
              <pre className="bg-stone-950 text-stone-100 p-4 rounded-md font-mono text-sm overflow-x-auto border border-stone-800">
                {installCommand}
              </pre>
              <button
                onClick={() =>
                  copyToClipboard(installCommand, setCopiedInstall)
                }
                className="absolute right-2 top-2 p-2 bg-stone-800 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
                title="Copy command"
              >
                {copiedInstall ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 text-green-500"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
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
                      d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Code Snippet */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                2. Use the SDK
              </h3>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Initialize the client with your API key to connect.
            </p>
            <div className="relative group">
              <div
                className="bg-[#24292e] text-stone-100 p-4 rounded-md font-mono text-sm overflow-x-auto border border-stone-800"
                dangerouslySetInnerHTML={{
                  __html: maskedCodeSnippetHtml,
                }}
              />
              <button
                onClick={() => copyToClipboard(codeSnippet, setCopiedCode)}
                className="absolute right-2 top-2 p-2 bg-stone-800 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
                title="Copy code"
              >
                {copiedCode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 text-green-500"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
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
                      d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-amber-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Warning
                  </h3>
                  <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    <p>
                      Your API key carries full access to your account. Keep it
                      secret and never share it in public repositories or
                      client-side code.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
