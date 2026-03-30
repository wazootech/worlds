<p align="center">
  <a href="https://docs.wazoo.dev">
    <picture>
      <source srcset="packages/docs/logo/dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/docs/logo/light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/docs/logo/dark.svg" alt="Worlds Platform" width="400" />
    </picture>
  </a>
</p>

<p align="center">
  <strong>High-Stakes Verifiable Context for AI.</strong>
</p>

<p align="center">
  <a href="https://jsr.io/@wazoo/worlds-sdk"><img src="https://jsr.io/badges/@wazoo/worlds-sdk" alt="JSR" /></a>
  <a href="https://jsr.io/@wazoo/worlds-sdk/score"><img src="https://jsr.io/badges/@wazoo/worlds-sdk/score" alt="JSR Score" /></a>
  <a href="https://github.com/wazootech/worlds"><img src="https://img.shields.io/badge/GitHub-black?logo=github" alt="GitHub" /></a>
  <a href="https://deepwiki.com/wazootech/worlds"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
</p>

Worlds Platform is the open-source **verifiable context layer** for AI. It is a
deterministic reasoning engine designed to manage, query, and prove knowledge
using [SPARQL](https://www.w3.org/TR/sparql11-overview/) standards at the edge.

Worlds Platform provides an interoperable context graph to improve agent
reasoning.

- **Reasoning**: Built-in SPARQL support for complex reasoning and federated
  knowledge discovery.
- **Agnostic**: Bring Your Own Brain (BYOB). Works with any LLM, framework, or
  agent.
- **Performance**: Designed for the edge. Low latency store operations.
- **AI-native**: First-class support for LLM tool-calling and context injection.

Worlds delivers these features through a unified, open-source API.

## Use Worlds

<table>
<tr>
<td width="50%" valign="top">

### I use AI tools

Manage your knowledge visually. Explore graphs, run queries, and build your
personal world model.

Persistent context across all your AI assistants and tools.

**[→ Open Worlds Console](https://console.wazoo.dev)**

<br>
</td>
<td width="50%" valign="top">

### I build AI products

Add deterministic reasoning and verifiable context to your agents with the SDK.

No RDF expertise required. Simple and modular.

**[→ Install CLI](https://docs.wazoo.dev/reference/cli)**

<br>
</td>
</tr>
</table>

## High-Stakes Context for your AI

The Worlds SDK provides AI agents with persistent, verifiable context.

> [!IMPORTANT]
> **Context is not just RAG.** Worlds Platform focuses on deterministic symbolic
> logic. It understands actual relationships and hierarchies, moving beyond
> "best guess" similarity matches to verifiable reasoning.

### Worlds Console

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
  prompt:
    "Identify the ultimate beneficial owner of the holding company and cite the source.",
});
```

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

// Add mission-critical knowledge (triples) to your world.
await sdk.worlds.sparql(
  worldId,
  `
  INSERT DATA {
    <http://corp.example/acme-corp> <http://schema.org/ownedBy> <http://corp.example/parent-co> .
    <http://corp.example/parent-co> <http://schema.org/legalName> "Parent Holdings Ltd." .
  }
`,
);

// Perform deterministic reasoning over your world.
const result = await sdk.worlds.sparql(
  worldId,
  `
  SELECT ?parentName WHERE {
    <http://corp.example/acme-corp> <http://schema.org/ownedBy> ?parent .
    ?parent <http://schema.org/legalName> ?parentName .
  }
`,
);
```

## Command line interface

Manage your worlds directly from the terminal.

### Install

```bash
deno install -A --name worlds jsr:@wazoo/worlds-cli
```

### Usage

```bash
# Create a new world
worlds create --label "My First World"

# List worlds
worlds list

# Run a SPARQL query
worlds sparql "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
```

## Prior research

The following research inspires this work:

- [Thinking with Knowledge Graphs (Arxiv)](https://arxiv.org/abs/2412.10654)
- [World Models (Ha & Schmidhuber)](https://worldmodels.github.io/)
- [MemGPT: Towards LLMs as Operating Systems (Arxiv)](https://arxiv.org/abs/2310.08560)

See the [whitepaper](https://docs.wazoo.dev/overview/whitepaper).

## Quicklinks

- [Documentation](https://docs.wazoo.dev)
- [Academy](https://docs.wazoo.dev/academy)
- [Quickstart](#build-with-worlds-sdk)
- [Wazoo Technologies](https://wazoo.dev)
- [Support](https://github.com/wazootech/worlds/issues)

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
