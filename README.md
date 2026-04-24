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
  Worlds API provides world models and verified facts for agents.
</p>

<p align="center">
  <a href="https://jsr.io/@wazoo/worlds-sdk"><img src="https://jsr.io/badges/@wazoo/worlds-sdk" alt="JSR" /></a>
  <a href="https://jsr.io/@wazoo/worlds-sdk/score"><img src="https://jsr.io/badges/@wazoo/worlds-sdk/score" alt="JSR Score" /></a>
  <a href="https://github.com/wazootech/worlds"><img src="https://img.shields.io/badge/GitHub-black?logo=github" alt="GitHub" /></a>
  <a href="https://deepwiki.com/wazootech/worlds"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" /></a>
</p>

Worlds Platform is a context layer for agents. The engine manages, queries, and
proves knowledge using [SPARQL](https://www.w3.org/TR/sparql11-overview/)
standards at the edge.

- Reasoning: Built-in SPARQL support for federated knowledge discovery.
- Agnostic: Works with any model, framework, or agent.
- AI-native: Tool-calling support and context injection.
- Provenance: Direct link to source data for all knowledge.
- Continual learning: Designed to improve recall and reasoning over time.

Worlds delivers these features through an open-source API.

## Use Worlds

<table>
<tr>
<td width="50%" valign="top">

### Manage knowledge

Explore graphs, run queries, and build your world model.

Persistent context for your assistants and tools.

[→ Open Worlds Console](https://console.wazoo.dev)

<br>
</td>
<td width="50%" valign="top">

### Build agents

Add reasoning and context to your agents with the SDK.

No RDF expertise required.

[→ Install CLI](https://docs.wazoo.dev/reference/cli)

<br>
</td>
</tr>
</table>

## Context for agents

The Worlds SDK provides agents with persistent context.

> [!IMPORTANT]
> Logical facts are technical descriptions of graph state. Worlds Platform
> focuses on deterministic symbolic logic. It manages actual relationships and
> hierarchies to provide verifiable reasoning.

### Worlds Console

Manage worlds through the web interface. Build graphs, test SPARQL queries, and
monitor agent memory.

The platform's AI SDK provides support for tool-calling.

```typescript
import type { WorldEntry } from "@wazoo/worlds-sdk";
import { Worlds } from "@wazoo/worlds-sdk";
import { createTools } from "@wazoo/worlds-ai-sdk";

// Remote API (via URL)
const worlds = new Worlds({
  url: "https://api.wazoo.dev",
  authToken: "your-api-key",
});

// Embedded in-memory (default)
const local = new Worlds();

const { text } = await generateText({
  model: openai("gpt-4o"),
  tools: createTools({
    worlds,
    sources: [{ id: "my-knowledge-base" }],
  }),
  prompt:
    "Identify the ultimate beneficial owner of the holding company and cite the source.",
});
```

## Build with Worlds SDK

If you are building agents or apps, Worlds provides the context stack through
one SDK.

### Install

```bash
deno add jsr:@wazoo/worlds-sdk
```

### Quickstart

```typescript
import { Worlds } from "@wazoo/worlds-sdk";

// Embedded in-memory (default)
const worlds = new Worlds();

// Remote API
const remote = new Worlds({
  url: "https://api.wazoo.dev",
  authToken: "your-api-key",
});

// File-based storage
const local = new Worlds({
  url: "file:./data.db",
});

const worldId = "my-knowledge-base";

// Add facts to your world.
await worlds.sparql(
  worldId,
  `
  INSERT DATA {
    <http://corp.example/acme-corp> <http://schema.org/ownedBy> <http://corp.example/parent-co> .
    <http://corp.example/parent-co> <http://schema.org/legalName> "Parent Holdings Ltd." .
  }
`,
);

// Perform reasoning over your world.
const result = await worlds.sparql(
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

Manage worlds directly from the terminal.

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

Developed with [**@wazootech**](https://github.com/wazootech)
