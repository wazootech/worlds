"use client";

import { useWorld } from "@/components/world-context";
import { WorldSparqlPlayground } from "@/components/world-sparql-playground";

export function WorldSparqlContent() {
  const { world } = useWorld();
  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-32 max-w-7xl mx-auto w-full">
      <WorldSparqlPlayground worldId={world.id} />
    </div>
  );
}
