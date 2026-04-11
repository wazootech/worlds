"use client";

import { useEffect, useState } from "react";
import { pingEndpointAction } from "@/app/actions";

export function LiveEndpointStatus({ url }: { url: string }) {
  const [status, setStatus] = useState<"checking" | "alive" | "offline">(
    "checking",
  );

  useEffect(() => {
    let mounted = true;

    async function checkEndpoint() {
      try {
        const isAlive = await pingEndpointAction(url);
        if (mounted) {
          setStatus(isAlive ? "alive" : "offline");
        }
      } catch {
        if (mounted) {
          setStatus("offline");
        }
      }
    }

    checkEndpoint();

    // Optionally set up an interval to keep checking, but for now a single check on mount is a good start.
    const intervalId = setInterval(checkEndpoint, 30000); // Check every 30s

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [url]);

  if (status === "checking") {
    return (
      <div className="flex items-center gap-2 mt-1.5 text-sm text-stone-400 dark:text-stone-500">
        <span className="relative flex h-1.5 w-1.5">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-stone-300 dark:bg-stone-600"></span>
        </span>
        <span>Checking endpoint...</span>
        <span className="font-mono text-xs bg-stone-100 dark:bg-stone-800/80 px-1.5 py-0.5 rounded-md border border-stone-200 dark:border-stone-800">
          {url}
        </span>
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="flex items-center gap-2 mt-1.5 text-sm text-stone-500 dark:text-stone-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
        </span>
        <span>Offline at</span>
        <span className="font-mono text-xs text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800/80 px-1.5 py-0.5 rounded-md border border-stone-200 dark:border-stone-800 line-through">
          {url}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1.5 text-sm text-stone-500 dark:text-stone-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
      </span>
      <span>Live at</span>
      <span className="font-mono text-xs bg-stone-100 dark:bg-stone-800/80 px-1.5 py-0.5 rounded-md border border-stone-200 dark:border-stone-800">
        {url}
      </span>
    </div>
  );
}
