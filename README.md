# Worlds API

Worlds API is a REST API that can be used to manage, query, update, and reason
over [SPARQL 1.1](https://www.w3.org/TR/sparql11-overview/)-compatible stores at
the edge, placing knowledge within arm's reach of your AI agent.

## BYOB

Bring your own **brain**. The Worlds API is agnostic to the agent using it.

## Design

Worlds API is designed to be simple and easy to use. You can embed it in your
agent applications, or run it locally or on the cloud.

We aren't just handing off our work to agents, we're coming up with entirely new
ways to work by delegating agents strategically and autonomously.

## Motivation

Legacy data architectures, designed for human-driven lookups, often collapse
under the demands of autonomous agents that must infer, plan, and act on
millions of decisions daily. Worlds API addresses the "Agentic Gap" by
introducing formal semantics to the edge.

- Reasoning over Retrieval: Agents do not just query data; they require
  explainable reasoning chains. By leveraging formal ontologies, Worlds API
  allows agents to derive conclusions from axioms rather than relying solely on
  black-box probabilities.
- Consistency at Machine Speed: In an agentic workflow, conflicting data (e.g.,
  an entity classified as both "Open" and "Closed") must be detected
  immediately. This API supports the consistency checking required to prevent
  autonomous hallucinations or operational errors.
- Open-World Assumption: Unlike proprietary graph databases that assume missing
  data is false, Worlds API supports open-world reasoning. This allows agents to
  treat unstated facts as "unknown," prompting them to seek additional
  information rather than rejecting valid options due to incomplete data,
  enabling compatibility and the ability for programs to be interoperable
  without ever meeting or coordinating with each other.

## Etymology

- **Quad** is the atomic unit of knowledge (also known as triple or triplet).
- **Store** is a set of RDF quads. Each RDF store or network of RDF stores is a
  knowledge base.
- **Knowledge Base** is a form of digital twin, a reified perspective or mirror
  of the world.
- **World** is a source of truth for a knowledge base.

We named the "Worlds API" after the management of multiple, coexisting
**Worlds** and their components.

## Benchmarks

Here are benchmark results testing the speed of encoding/decoding Oxigraph
stores in different formats:

```
> deno task bench
Task bench deno bench -A
Check file:///C:/Users/ethan/Documents/GitHub/worlds-api/src/oxigraph/oxigraph-service.bench.ts
    CPU | 12th Gen Intel(R) Core(TM) i7-1280P
Runtime | Deno 2.5.6 (x86_64-pc-windows-msvc)

file:///C:/Users/ethan/Documents/GitHub/worlds-api/src/oxigraph/oxigraph-service.bench.ts

| benchmark            | time/iter (avg) |        iter/s |      (min … max)      |      p75 |      p99 |     p995 |
| -------------------- | --------------- | ------------- | --------------------- | -------- | -------- | -------- |
| decodeStore jsonld   |         23.1 µs |        43,340 | (  8.7 µs …   5.0 ms) |  15.3 µs | 210.8 µs | 484.8 µs |
| encodeStore jsonld   |          4.6 µs |       219,400 | (  4.3 µs …   5.7 µs) |   4.5 µs |   5.7 µs |   5.7 µs |
| decodeStore nq       |         19.5 µs |        51,280 | (  6.3 µs …   4.0 ms) |   9.7 µs | 345.3 µs | 827.9 µs |
| encodeStore nq       |          2.9 µs |       345,100 | (  2.7 µs …   3.7 µs) |   2.9 µs |   3.7 µs |   3.7 µs |
| decodeStore trig     |         17.0 µs |        58,980 | (  6.7 µs …   4.8 ms) |   9.0 µs | 316.1 µs | 760.7 µs |
| encodeStore trig     |          3.1 µs |       318,700 | (  3.0 µs …   3.8 µs) |   3.2 µs |   3.8 µs |   3.8 µs |
```

## Papers

This work is inspired by the following research papers:

- [A Benchmark to Understand the Role of Knowledge Graphs on Large Language Model's Accuracy for Question Answering on Enterprise SQL Databases](https://arxiv.org/abs/2311.07509)
- [Thinking with Knowledge Graphs](https://arxiv.org/abs/2412.10654v1)
- [Graph Constrained Reasoning](https://github.com/RManLuo/graph-constrained-reasoning)

---

Developed with 🧪 [**@FartLabs**](https://github.com/FartLabs)
