# Worlds Platform™

[![JSR](https://jsr.io/badges/@wazoo/sdk)](https://jsr.io/@wazoo/sdk)
[![JSR score](https://jsr.io/badges/@wazoo/sdk/score)](https://jsr.io/@wazoo/sdk/score)

**Worlds Platform™** is a REST API designed to manage, query, update, and reason
over [SPARQL](https://www.w3.org/TR/sparql11-overview/)-compatible knowledge
bases at the edge. It places a malleable **context graph** within arm's reach of
your AI agent.

## Design

**Bring your own brain (BYOB).** Worlds Platform™ is agnostic to the agent using
it.

**Powered by N3.** Worlds Platform™ leverages
[N3](https://github.com/rdfjs/N3.js) for high-performance store operations.

## Usage

You can use the Worlds SDK to interact with your knowledge bases
programmatically.

```typescript
import { WorldsSdk } from "@wazoo/sdk";

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
//     subject: "http://example.com/gregory",
//     predicate: "http://schema.org/givenName",
//     object: "Gregory",
//     vecRank: 0.1,
//     ftsRank: 0.1,
//     score: 0.9
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
deno task start:server
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

For further information, please refer to our [whitepaper](packages/docs/paper.mdx).


## Glossary

- **Neuro-symbolic AI:** An AI system that combines the strengths of neural
  networks and structured data.
- **RDF:** A W3C standard for representing information.
- **SPARQL:** A W3C standard for querying and updating RDF data.
- **Ontology:** A formal description of a domain of knowledge.

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
