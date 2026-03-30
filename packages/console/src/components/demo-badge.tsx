"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useState } from "react";

export function DemoBadge({ onDismiss }: { onDismiss?: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-500 text-white py-1.5 px-4 flex items-center justify-center gap-4 relative overflow-hidden shadow-md">
      {/* Animated background pulse */}
      <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />

      <div className="relative flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
        <span>Demo Mode: You can claim this organization by signing up.</span>
      </div>

      <Link
        href="/sign-up"
        className="relative px-3 py-1 rounded-full bg-white text-amber-600 text-xs font-bold hover:bg-stone-50 transition-colors shadow-sm"
      >
        Sign up for full access
      </Link>

      <button
        onClick={() => {
          setIsVisible(false);
          onDismiss?.();
        }}
        className="absolute right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
