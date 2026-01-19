import { persist, restore } from "@orama/plugin-data-persistence";
import type { FactOrama } from "./orama-search-engine.ts";
import { createFactOrama } from "./orama-search-engine.ts";

export async function createFilePersistedOrama(filePath: string) {
  let orama: FactOrama;
  let wasCreated = false;

  try {
    const data = await Deno.readTextFile(filePath);
    const restored = await restore("json", data);
    orama = restored as FactOrama;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log(
        `No existing ${filePath} found, starting with fresh Orama data`,
      );

      orama = await createFactOrama();
      wasCreated = true;
    } else {
      throw error;
    }
  }

  return {
    orama,
    wasCreated,
    persist: async () => {
      const serialized = await persist(orama, "json");
      const data = typeof serialized === "string"
        ? serialized
        : new TextDecoder().decode(serialized);
      await Deno.writeTextFile(filePath, data);
    },
  };
}
