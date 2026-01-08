# Worlds API: Malleable Knowledge at the Edge for Neuro-Symbolic Agents

**Author**: EthanThatOneKid\
**Date**: December 25, 2025\
**Institution**: FartLabs Research

---

## Abstract

Large Language Models (LLMs) have demonstrated remarkable capabilities in
natural language understanding and generation, yet they suffer from a
fundamental limitation: capability is not equivalent to knowledge. While
Retrieval-Augmented Generation (RAG) using vector databases attempts to bridge
this gap, it often fails to capture the intricate structural relationships
required for complex reasoning. This paper introduces **Worlds API™**, a novel
infrastructure layer that acts as a "detachable hippocampus" for AI agents. By
combining an in-memory SPARQL 1.1 store (Oxigraph) with edge-distributed SQLite,
Worlds API enables agents to maintain mutable, structured knowledge graphs. This
system implements a hybrid search architecture—currently using full-text search
(FTS5) with plans for fusing vector similarity, full-text search, and graph
querying via Reciprocal Rank Fusion (RRF)—to support low-latency, neuro-symbolic
reasoning at the edge.

---

## 1. Introduction

### 1.1 The Context: The Ephemeral Nature of LLMs

The rise of Transformer-based models has revolutionized artificial intelligence,
providing agents with fluent communication skills and broad "world knowledge"
frozen in their weights. However, these models are fundamentally stateless. Once
a context window closes, the "thought" is lost. For an AI agent to operate
autonomously over long periods, it requires persistent memory that is both
accessible and mutable.

### 1.2 The Problem: The Reasoning Gap

Current industry standards rely heavily on Vector Databases to provide long-term
memory. This approach, known as Retrieval-Augmented Generation (RAG), converts
text into high-dimensional embedding vectors. While effective for semantic
similarity (e.g., finding documents _about_ "cats"), vector search struggles
with precise logical queries (e.g., "Who is the owner of the cat that chased the
mouse?"). Vectors compress meaning into continuous space, losing the discrete
edges and nodes that define relationships. This creates a "Reasoning Gap," where
agents can retrieve related information but cannot reason over it fundamentally.

### 1.3 The Solution: Worlds API

We propose **Worlds API**, a system designed to provide malleable knowledge
within arm's reach of the AI agent. Unlike static knowledge bases, "Worlds" are
dynamic, graph-based environments that agents can query, update, and reason over
in real-time.

### 1.4 Thesis

By integrating a standards-compliant RDF store with an edge-first architecture,
Worlds API successfully bridges the gap between neural processing and symbolic
reasoning, enabling the development of Neuro-Symbolic agents capable of
maintaining complex, evolving world models.

---

## 2. Methodology

### 2.1 System Architecture

The Worlds API architecture follows a segregated Client-Server model designed
specifically for edge deployment (e.g., Deno Deploy, Cloudflare Workers). This
ensures that knowledge is "always hot," retrievable in milliseconds to minimize
agent latency.

- **Runtime**: Built on Deno, utilizing TypeScript for type safety and modern
  web standards.
- **Control Plane**: A Next.js dashboard (separate component) provides human
  oversight, while the API server handles agent requests.
- **The "Detachable Hippocampus"**: The core design pattern treats the knowledge
  base as a plug-in component. The agent (the "cortex") can swap "Worlds"
  (contexts) seamlessly, allowing for task-switching without context pollution.

### 2.2 Storage Engine: The best of both worlds

To achieve both semantic flexibility and structural precision, we employ a
hybrid storage strategy:

#### 2.2.1 Oxigraph (Hot Memory)

An in-memory, WASM-compiled RDF store that supports SPARQL 1.1. This allows for
complex graph pattern matching (e.g., recursive queries, property paths) that
SQL and Vectors cannot easily handle.

**Persistence Strategy:**

- **Pre-loading**: The WASM module is pre-loaded in the global scope (outside
  the request handler) to ensure the isolate is "warm" for incoming requests,
  minimizing cold start latency.
- **Cold Start**: Upon initialization, the graph state is hydrated from the
  `kb_statements` SQLite table, which stores denormalized statement data for
  rapid loading.
- **Warm State**: The in-memory store persists in the Deno Edge Cache between
  requests, enabling millisecond read latency for subsequent queries.
- **Write Invalidation**: Updates are written synchronously to SQLite (Source of
  Truth). Upon success, the system invalidates the Edge Cache for that specific
  World, forcing a fresh hydration from SQLite on the next read to ensure
  consistency.

#### 2.2.2 SQLite via LibSQL Client (Cold Storage)

We use the LibSQL client library to access SQLite databases optimized for the
edge. It handles persistence, providing durability for the in-memory graph. The
underlying storage uses SQLite with WAL (Write-Ahead Logging) mode for
concurrency.

**Normalized Statement Store**: To avoid the overhead of a general-purpose
SPARQL engine while maintaining semantic integrity, we utilize a normalized
schema that separates the lexical value of a term from its graph topology:

- **`terms` Table**: Deduplicates IRIs, Literals, and Blank Nodes. Stores `id`
  (INTEGER), `value` (TEXT), and `term_type` (TEXT).
- **`statements` Table**: Stores relationships as integer triples referencing
  the `terms` table, enabling efficient graph traversal.
- **`chunks` Table**: The source of truth for text segments derived from literal
  terms, storing `id`, `term_id`, and `text_content`.

Additionally, a denormalized `kb_statements` table stores statements with string
values directly for rapid Oxigraph hydration, trading storage redundancy for
hydration speed.

#### 2.2.3 Hexastore Indexing

To ensure O(log N) performance for any RDF triple pattern, we implement a
Hexastore using SQLite's `WITHOUT ROWID` feature for "covered indices". This
creates three permutation tables for optimized lookups:

```sql
-- Main statement table (SPO pattern)
CREATE TABLE statements_spo (
    subject_id INTEGER, predicate_id INTEGER, object_id INTEGER,
    PRIMARY KEY (subject_id, predicate_id, object_id)
) WITHOUT ROWID;

-- Permutation for (POS pattern) - optimized for property lookups
CREATE TABLE statements_pos (
    predicate_id INTEGER, object_id INTEGER, subject_id INTEGER,
    PRIMARY KEY (predicate_id, object_id, subject_id)
) WITHOUT ROWID;

-- Permutation for (OSP pattern) - optimized for reverse-lookup/in-bound links
CREATE TABLE statements_osp (
    object_id INTEGER, subject_id INTEGER, predicate_id INTEGER,
    PRIMARY KEY (object_id, subject_id, predicate_id)
) WITHOUT ROWID;
```

This design ensures that queries matching any triple pattern (subject,
predicate, or object) can leverage an optimal index, avoiding full table scans.

#### 2.2.4 Hybrid Search (Current & Planned)

**Current Implementation (V1)**: Uses SQLite FTS5 (Full-Text Search) for
keyword-based retrieval over text chunks. This provides BM25 ranking for
semantic keyword matching.

**Planned Enhancement**: We are designing a Reciprocal Rank Fusion (RRF) system
to combine results from three distinct indices. The planned SQL implementation
demonstrates the fusion strategy:

```sql
WITH fts_results AS (
  SELECT rowid, rank FROM chunks_fts WHERE match(:query)
),
vec_results AS (
  SELECT rowid, distance FROM chunks_vec WHERE embedding MATCH :vector
)
SELECT 
  c.rowid, 
  c.text_content,
  (1.0 / (60 + fts.rank)) + (1.0 / (60 + vec.rank)) AS rrf_score
FROM chunks c
JOIN fts_results fts ON c.rowid = fts.rowid
JOIN vec_results vec ON c.rowid = vec.rowid
ORDER BY rrf_score DESC;
```

This will fuse:

- **Vector Index**: For semantic similarity (512-dim embeddings, planned).
- **Full-Text Search (FTS5)**: For exact keyword matching (currently
  implemented).
- **SPARQL Graph Queries**: For structural relationships (currently
  implemented).

#### 2.2.5 Engineering Requirements

The storage system implements several engineering requirements to ensure
performance and consistency:

- **Concurrency**: `PRAGMA journal_mode = WAL;` enables Write-Ahead Logging for
  concurrent read/write operations.
- **Memory Mapping**: `PRAGMA mmap_size = 30000000000;` (30GB) allows SQLite to
  memory-map large database files for improved I/O performance.
- **Atomicity**: All statement updates must occur within a single transaction
  across all three Hexastore permutation tables to maintain graph consistency.

#### 2.2.6 Graph Traversal Optimization

To avoid "N+1" query patterns when bulk reading and reconstructing objects, we
use a **Recursive Common Table Expression (CTE)**. This allows the engine to
traverse the graph starting at a root node and collect all nested blank node
branches in a single pass:

```sql
WITH RECURSIVE graph_hydration(s_id, p_id, o_id) AS (
    SELECT s, p, o FROM statements_spo 
    WHERE s = (SELECT id FROM terms WHERE value = 'root_uri')
    UNION ALL
    SELECT t.s, t.p, t.o
    FROM statements_spo t
    JOIN graph_hydration h ON t.s = h.o_id
    JOIN terms r ON h.o_id = r.id
    WHERE r.term_type = 'BlankNode'
)
SELECT * FROM graph_hydration;
```

This optimization is particularly important when reconstructing complex nested
structures with multiple levels of blank nodes.

### 2.3 Data Model: Malleable Knowledge

The fundamental unit of data is the **RDF Triple** (Subject, Predicate, Object).
Unlike rigid SQL schemas, RDF allows for schema-less data evolution. "Worlds"
are designed to be malleable:

- **Real-time Updates**: Agents can insert, update, and delete triples via
  SPARQL UPDATE operations, allowing for dynamic knowledge evolution.
- **Blank Node Handling**: We implement Persistent Skolemization to handle
  nested blank nodes losslessly. The process involves three stages:
  1. **Ingestion**: Incoming blank nodes (`_:b1`) are mapped to stable Skolem
     IRIs: `http://local/.well-known/genid/[UUID]`.
  2. **Storage**: The `term_type` is explicitly stored as `'BlankNode'` in the
     `terms` table, preserving the semantic distinction from named nodes.
  3. **Reconstruction**: Upon export, terms flagged as `BlankNode` are rendered
     back as anonymous square brackets `[]` or blank node labels, ensuring the
     internal storage remains transparent to the user while maintaining
     referential integrity.
- **Forking & Merging (Future Work)**: While the architecture supports forking
  and merging Worlds (by copying and combining graph data), this functionality
  is planned for future releases. The current implementation focuses on
  individual World management.
- **Reasoning**: Using SPARQL `CONSTRUCT` queries, agents can infer new facts
  from existing data (e.g., assuming `Parent(A, B)` and `Male(A)` implies
  `Father(A, B)`).

---

## 3. Results

### 3.1 Functional Capabilities

The primary result of this architecture is the unified access to structured and
unstructured data. Where a traditional vector store might return a document
chunk based on keyword overlap, Worlds API can answer composite queries such as:

> "Find all entities that are _located in_ 'New York' AND are _types of_
> 'Italian Restaurant' AND have a description semantically similar to 'cozy
> romantic dinner'."

This query leverages the Graph (location, type) via SPARQL and the Full-Text
Search (semantic description) via FTS5 simultaneously. The planned RRF
integration will further enhance this by adding vector similarity to the fusion.

### 3.2 Developer Experience & Tooling

To facilitate adoption, we developed the `@fartlabs/worlds` SDK, which abstracts
the complexity of SPARQL. The SDK provides:

- **Type-safe API Client**: Full TypeScript support with comprehensive method
  coverage for all REST endpoints (21+ endpoints including worlds, statements,
  chunks, accounts, limits, and usage).
- **RDF Encoding Support**: Handles multiple serialization formats (N-Quads,
  N-Triples, Turtle, JSON-LD, RDF/XML) with automatic content negotiation.
- **Internal Operations**: Extended `InternalWorlds` class for admin operations
  (account management, usage tracking, limit configuration).

**Planned AISDK Tools**: We are designing drop-in tools for the Vercel AISDK
that will allow models to interact with the graph using natural language
function calls (`remember`, `recall`, `forget`). These tools are currently in
design and will be available in a future release. This will further verify the
"Detachable Hippocampus" design pattern by enabling agents to store facts,
recall them in later sessions, and navigate relationships without explicit
training on graph query languages.

### 3.3 API Architecture

The system exposes a comprehensive REST API with 21+ endpoints organized into
control plane (internal/admin) and data plane (public) operations.

#### 3.3.1 World Management

Worlds can be created, read, updated, and deleted with support for **lazy
claiming**: if a World does not exist and the user has sufficient quota, it is
automatically created on the first write operation (POST or SPARQL UPDATE). This
reduces the cognitive overhead of explicit World creation while maintaining
quota enforcement.

#### 3.3.2 SPARQL Operations

The API provides flexible SPARQL access through two methods:

- **GET `/v1/worlds/:world/sparql`**: Query execution via `?query=...` URL
  parameter, suitable for read-only operations and simple queries.
- **POST `/v1/worlds/:world/sparql`**: Supports both queries and updates via
  request body with Content-Type negotiation:
  - `application/sparql-query` for SELECT/CONSTRUCT queries
  - `application/sparql-update` for INSERT/DELETE operations

Both endpoints support lazy claiming on write operations, enabling seamless
World creation during agent interactions.

#### 3.3.3 Search Endpoints

Dedicated endpoints provide search capabilities over different data types:

- **Statements**: `GET /v1/worlds/:world/statements?query=...` - Full-text
  search over statement objects with ranked results.
- **Chunks**: `GET /v1/worlds/:world/chunks?query=...` - Full-text search over
  text chunks with BM25 ranking.
- **Individual Access**: Direct access to specific statements and chunks via
  ID-based endpoints.

#### 3.3.4 Access Control & Multi-tenancy

The platform implements **Dynamic Access Control** via runtime plan enforcement:

- **Runtime Enforcement**: The API Gateway fetches quotas for the authenticated
  account's `plan_tier` on every request, enabling real-time limit adjustments
  without code deployment.
- **Instant Upgrades**: Changing a user's `plan_tier` in the database
  immediately unlocks higher limits and features restricted to specific plans.
- **Granular Feature Flags**: Plans can be mapped to specific capability flags
  (e.g., access to "Reasoning" endpoints, vector search, etc.).

#### 3.3.5 Usage Monitoring

The system implements asynchronous metering to support "Pay-as-you-go" pricing
and prevent abuse:

- **Metering Strategy**: Usage is metered by Service Account (API Key) and
  aggregated into time buckets (e.g., 1-minute intervals) in the `kb_usage`
  table.
- **Benefits**:
  - **Billing Transparency**: Users can see exactly which key incurred costs.
  - **Resource Control**: Granular limits can be applied to specific agents.
  - **Zero Latency Impact**: Metering is designed to be non-blocking where
    possible.

#### 3.3.6 Authentication

Dual-strategy authentication supports different use cases:

- **WorkOS AuthKit**: For human users accessing the dashboard, providing OIDC
  authentication with session management.
- **API Keys**: For automations and agents, using Bearer token authentication
  (`Authorization: Bearer <sk_world_key_...>`) with keys scoped to specific
  `world_id`s to prevent cross-contamination between agents.

---

## 4. Discussion

### 4.1 Neuro-Symbolic AI Implications

Worlds API represents a practical implementation of Neuro-Symbolic AI. It
acknowledges that Neural Networks (System 1 thinking - fast, intuitive,
approximate) benefit significantly from access to Symbolic Systems (System 2
thinking - slow, logical, precise). By offloading the memory and reasoning
burden to the World, the Agent is free to focus on synthesis and communication.

### 4.2 Calm Technology

A key design philosophy was "Calm Technology." Managing a knowledge graph is
traditionally complex. By automating the "Triple Store management" and providing
a zero-config Deno task (`deno task start`), we reduce the cognitive load on
developers, allowing them to focus on agent behavior rather than database
administration.

### 4.3 Limitations and Future Work

While the in-memory model (Oxigraph) provides exceptional speed, it introduces
RAM constraints. As "Worlds" grow into the millions of triples, memory usage
becomes a limiting factor. **Current Limitations:**

- **Vector Search**: The vector index infrastructure is designed but not yet
  deployed. Current search relies on FTS5 and SPARQL only.
- **RRF Fusion**: The Reciprocal Rank Fusion algorithm is architected but not
  yet implemented. V1 uses optimized SQL FTS.
- **AISDK Tools**: The natural language tools (`remember`, `recall`, `forget`)
  are designed but not yet exported.

**Future Work** includes:

- **Hybrid Search with RRF**: Complete the integration of vector similarity
  search with FTS5 and SPARQL using Reciprocal Rank Fusion for comprehensive
  search capabilities.
- **Separated Vector Store**: Offloading the bulk of vector data from the
  primary SQLite/Memory store to a specialized index to reduce memory pressure.
- **World Forking & Merging**: Implement explicit APIs for forking Worlds to
  test hypotheses and merging successful forks back into the main timeline.
- **Sandboxed Code Execution**: Investigating the integration of Deno Sandboxes
  to allow agents to write and execute code against their own data for complex
  calculations.
- **Distributed Synchronization**: Implementing `BroadcastChannel` APIs for
  real-time synchronization of graph state across distributed edge nodes.

---

## 5. Conclusion

Worlds API demonstrates that it is possible to bring malleable, structured
knowledge to the edge. By combining Vector Search (planned), Full-Text Search
(implemented), and Knowledge Graphs (implemented) through a hybrid storage
engine, we provide AI agents with the context and reasoning capabilities
necessary for true autonomy. The current V1 implementation provides a solid
foundation with SPARQL querying and FTS-based search, with a clear roadmap for
enhancing search capabilities through RRF and vector integration. As we move
towards AGI, the ability for an agent to not just "retrieve" but to "know" and
"reason" will be the defining characteristic of the next generation of
intelligent systems.

---

## 6. References

1. **Oxigraph**. (n.d.). _Oxigraph: SPARQL graph database_. GitHub.
   https://github.com/oxigraph/oxigraph
2. **Willison, S.** (2024, October 4). _Hybrid full-text search and vector
   search with SQLite_. Simon Willison's Weblog.
   https://simonwillison.net/2024/Oct/4/hybrid-full-text-search-and-vector-search-with-sqlite/
3. **W3C.** (2013). _SPARQL 1.1 Query Language_. W3C Recommendation.
   https://www.w3.org/TR/sparql11-query/
4. **Ha, D., & Schmidhuber, J.** (2018). _World Models_. arXiv preprint
   arXiv:1803.10122. https://worldmodels.github.io/
5. **Repo Author.** (2024). _Worlds API™ Design Document_. GitHub.
   https://github.com/EthanThatOneKid/worlds-api
