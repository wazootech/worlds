import { assert, assertMatch } from "@std/assert";
import { createUlidIriGenerator } from "./ulid.ts";
import { createUuidIriGenerator } from "./uuid.ts";

Deno.test("createUlidIriGenerator", async () => {
  const generateIri = createUlidIriGenerator();
  const iri = await generateIri({});
  assertMatch(iri, /^[0-9A-Z]{26}$/);
});

Deno.test("createUuidIriGenerator", async () => {
  const generateIri = createUuidIriGenerator();
  const iri = await generateIri({});
  assertMatch(
    iri,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  );
});
