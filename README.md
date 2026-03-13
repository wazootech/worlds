<p align="center">
  <picture>
    <source srcset="packages/docs/logo/dark.svg" media="(prefers-color-scheme: dark)">
    <source srcset="packages/docs/logo/light.svg" media="(prefers-color-scheme: light)">
    <img src="packages/docs/logo/dark.svg" alt="Worlds Platform" width="400" />
  </picture>
</p>

<p align="center">
  <strong>World Models as a Service. Context engine for AI.</strong>
</p>

<p align="center">
  <a href="https://jsr.io/@wazoo/worlds-sdk">SDK</a> ·
  <a href="https://jsr.io/@wazoo/worlds-sdk/score">Score</a> ·
  <a href="https://github.com/wazootech/worlds">GitHub</a> ·
  <a href="https://deepwiki.com/wazootech/worlds">Wiki</a>
</p>

<p align="center">
  <a href="https://jsr.io/@wazoo/worlds-sdk"><img src="https://jsr.io/badges/@wazoo/worlds-sdk" alt="JSR" /></a>
  <a href="https://jsr.io/@wazoo/worlds-sdk/score"><img src="https://jsr.io/badges/@wazoo/worlds-sdk/score" alt="JSR Score" /></a>
</p>

---

Worlds Platform is the memory and context layer for AI. It is a REST API
designed to manage, query, update, and reason over
[SPARQL](https://www.w3.org/TR/sparql11-overview/)-compatible knowledge bases at
the edge.

Worlds Platform provides a structured, malleable context graph to improve agent
reasoning.

|                 |                                                                        |
| --------------- | ---------------------------------------------------------------------- |
| **Reasoning**   | Built-in SPARQL support for complex reasoning and knowledge discovery. |
| **Structured**  | N3-powered triple store for high-performance knowledge management.     |
| **Agnostic**    | Bring Your Own Brain (BYOB). Works with any LLM, framework, or agent.  |
| **Performance** | Designed for the edge. Low latency store operations.                   |
| **AI native**   | First-class support for LLM tool-calling and context injection.        |

All of this is delivered via a simple, unified API.

---

## Use Worlds

<table>
<tr>
<td width="50%" valign="top">

### I use AI tools

Manage your knowledge visually. Explore graphs, run queries, and build your
personal world model.

Persistent context across all your AI assistants and tools.

**[→ Open Worlds console](packages/console)**

</td>
<td width="50%" valign="top">

### I build AI products

Add structured memory, RAG, and reasoning to your agents with the SDK.

No RDF expertise required. Simple, powerful, and scalable.

**[→ Jump to developer quickstart](#build-with-worlds-sdk)**

</td>
</tr>
</table>

---

## Give your AI a Worlds model

The Worlds SDK and AI SDK provide AI agents with persistent, structured memory.

### The console

Manage your worlds through our web interface. Build graphs, test SPARQL queries,
and monitor your agent's memory.

### AI SDK tools

The Worlds Platform AI SDK provides first-class support for LLM tool-calling.

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { WorldsSdk } from "@wazoo/worlds-sdk";
import { createTools } from "@wazoo/worlds-ai-sdk";

const sdk = new WorldsSdk({
  baseUrl: "http://localhost:8000",
  apiKey: "your-api-key",
});

const { text } = await generateText({
  model: openai("gpt-4o"),
  tools: createTools({
    sdk,
    sources: [{ id: "my-knowledge-base" }],
  }),
  prompt: "Find all people in the knowledge base and describe them.",
});
```

---

## Build with Worlds SDK

If you're building AI agents or apps, Worlds provides the entire context stack
through one SDK including memory, reasoning, and graph management.

### Install

```bash
deno add jsr:@wazoo/worlds-sdk
```

### Quickstart

```typescript
import { WorldsSdk } from "@wazoo/worlds-sdk";

// Initialize the client.
const sdk = new WorldsSdk({
  baseUrl: "http://localhost:8000",
  apiKey: "your-api-key",
});

const worldId = "my-knowledge-base";

// Add some knowledge (triples) to your world.
await sdk.worlds.sparql(
  worldId,
  `
  INSERT DATA {
    <http://example.com/ethan> <http://schema.org/relatedTo> <http://example.com/gregory> .
    <http://example.com/gregory> <http://schema.org/givenName> "Gregory" .
  }
`,
);

// Reason over your world using SPARQL.
const result = await sdk.worlds.sparql(
  worldId,
  `
  SELECT ?name WHERE {
    <http://example.com/ethan> <http://schema.org/relatedTo> ?person .
    ?person <http://schema.org/givenName> ?name .
  }
`,
);
```

---

## Under the hood

```
Your App / AI Agent
        ↓
    Worlds SDK
        │
        ├── World Model Engine    N3-powered triple store, high-perf edge operations
        ├── SPARQL Processor      Complex reasoning, graph updates, and queries
        ├── Search & Distill      FTS + Vector search across your knowledge graph
        └── Tool Bridge           Automatic LLM tool generation and context injection
```

**Memory is not just RAG.** Worlds Platform focuses on symbolic memory. It
understands relationships, hierarchies, and logic, moving beyond similarity
matches to true reasoning.

---

## Research and documentation

This work is inspired by the intersection of neuro-symbolic AI and knowledge
graphs:

- [Thinking with Knowledge Graphs (Arxiv)](https://arxiv.org/abs/2412.10654)
- [World Models (Ha & Schmidhuber)](https://worldmodels.github.io/)
- [MemGPT: Towards LLMs as Operating Systems (Arxiv)](https://arxiv.org/abs/2310.08560)

For further information, please refer to our
[whitepaper](packages/docs/overview/whitepaper.mdx).

---

## Links

- [Documentation](packages/docs)
- [Quickstart](#build-with-worlds-sdk)
- [Wazoo Tech](https://github.com/wazootech)
- [Support](https://deepwiki.com/wazootech/worlds)

---

<p align="center">
  <strong>Give your AI a Worlds model.</strong>
</p>

---

Developed with [**@wazootech**](https://github.com/wazootech)
