import { assertEquals } from "@std/assert";
import { UniversalSentenceEncoderEmbeddings } from "#/lib/embeddings/use.ts";

Deno.test.ignore("UniversalSentenceEncoderEmbeddings", async () => {
  const embeddings = new UniversalSentenceEncoderEmbeddings();
  const text = "Hello world";
  const vector = await embeddings.embed(text);

  console.log(`Vector for "${text}":`, vector.slice(0, 5), "...");
  assertEquals(vector.length, 512);
});
