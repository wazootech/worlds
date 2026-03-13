# Worlds Platform AI SDK

[![JSR](https://jsr.io/badges/@wazoo/worlds-ai-sdk)](https://jsr.io/@wazoo/worlds-ai-sdk)

**Worlds Platform AI SDK** provides a set of tools for LLMs to interact with the
[Worlds Platform](https://docs.wazoo.dev). It enables AI agents to discover
schemas, execute SPARQL queries, search for entities, and generate IRIs within a
knowledge base.

## Tools

The following tools are available for use with LLM frameworks (like Vercel AI
SDK, LangChain, etc.):

- **discoverSchema**: Exploration of the ontology and schema of a specific
  world.
- **executeSparql**: Direct execution of SPARQL queries against a world.
- **searchEntities**: Vector-based semantic search for entities within a world.
- **generateIri**: Utility for generating valid IRIs for new entities based on
  descriptions.
- **disambiguateEntities**: (Coming soon) Utility for mapping natural language
  entities to existing IRIs.
- **validateRdf**: (Coming soon) Utility for validating generated RDF against a
  world.

## Usage

The tools are designed to work seamlessly with the
[Vercel AI SDK](https://sdk.ai/docs/ai-sdk-core/tools-and-tool-calling).

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { WorldsSdk } from "@wazoo/worlds-sdk";
import { createTools } from "@wazoo/worlds-ai-sdk";

const sdk = new WorldsSdk({
  apiKey: process.env.WORLDS_API_KEY,
  baseUrl: "https://api.worlds.dev",
});

const tools = createTools({
  sdk,
  sources: [{ id: "my-world-id" }],
});

const { text } = await generateText({
  model: openai("gpt-4o"),
  tools,
  prompt: "Find all people in the knowledge base and describe them.",
});
```

## Reference

- [Worlds AI SDK Documentation](https://docs.wazoo.dev/reference/sdk-overview)
- [Vercel AI SDK: Tools and Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
