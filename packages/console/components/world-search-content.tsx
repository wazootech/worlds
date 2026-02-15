"use client";

import { useWorld } from "@/components/world-context";
import { WorldTripleSearch } from "@/components/world-triple-search";

export function WorldSearchContent() {
  const { world } = useWorld();
  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-32 max-w-7xl mx-auto w-full">
      <WorldTripleSearch worldId={world.id} />
    </div>
  );
}
