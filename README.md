# Worlds API™

[![JSR](https://jsr.io/badges/@fartlabs/worlds)](https://jsr.io/@fartlabs/worlds)
[![JSR score](https://jsr.io/badges/@fartlabs/worlds/score)](https://jsr.io/@fartlabs/worlds/score)
[![GitHub Actions](https://github.com/wazootech/worlds-api/actions/workflows/check.yaml/badge.svg)](https://github.com/wazootech/worlds-api/actions/workflows/check.yaml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/wazootech/worlds-api)

**Worlds API™** is a REST API designed to manage, query, update, and reason over
[SPARQL 1.1](https://www.w3.org/TR/sparql11-overview/)-compatible knowledge
bases at the edge. It places a malleable **context graph** within arm's reach of
your AI agent.

## Design

**Bring your own brain (BYOB).** Worlds API™ is agnostic to the agent using it.

**Powered by N3.** Worlds API™ leverages [N3](https://github.com/rdfjs/N3.js)
for high-performance store operations.

## Usage

You can use the Worlds API SDK to interact with your knowledge bases
programmatically.

```typescript
import { WorldsSdk } from "@fartlabs/worlds";

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

// Search your world to find the named node for Gregory.
const searchResult = await sdk.worlds.search(worldId, "Gregory");

console.log(searchResult);
// [
//   {
//     score: 0.9,
//     value: {
//       subject: "http://example.com/gregory",
//       predicate: "http://schema.org/givenName",
//       object: "Gregory"
//     }
//   }
// ]

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

console.log(result);
// {
//   head: { vars: [ "name" ] },
//   results: {
//     bindings: [
//       {
//         name: { type: "literal", value: "Gregory" }
//       }
//     ]
//   }
// }
```

## Development

Contributions are welcome! Please open an issue or submit a pull request.

**Generate code:**

```sh
deno task generate
```

**Start the development server:**

```sh
deno task start
```

**Format, lint, and test before committing:**

```sh
deno task precommit
```

## Etymology

We named the **Worlds API™** after "World Models as a Service" as a nod to the
[Many-worlds interpretation](https://en.wikipedia.org/wiki/Many-worlds_interpretation).

## Research

This work is inspired by the intersection of neuro-symbolic AI and knowledge
graphs:

- [Thinking with Knowledge Graphs (Arxiv)](https://arxiv.org/abs/2412.10654)
- [World Models (Ha & Schmidhuber)](https://worldmodels.github.io/)
- [MemGPT: Towards LLMs as Operating Systems (Arxiv)](https://arxiv.org/abs/2310.08560)

For further information, please refer to our [whitepaper](docs/paper.md).

## Glossary

- **Neuro-symbolic AI:** An AI system that combines the strengths of neural
  networks and structured data.
- **RDF:** A W3C standard for representing information.
- **SPARQL:** A W3C standard for querying and updating RDF data.
- **Ontology:** A formal description of a domain of knowledge.

---

Developed with 🧪 [**@FartLabs**](https://github.com/FartLabs)
