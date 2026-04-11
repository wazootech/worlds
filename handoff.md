# Handoff: SDK Architectural Refactor

This document summarizes the major structural changes made to the `worlds` package during the session on April 10, 2026. This refactor focused on de-cluttering the SDK root, enforcing SRP (Single Responsibility Principle), and decoupling core domain logic from server-side HTTP concerns.

## Current State
- **Branch**: `feat/system-world-multitenancy` (Pushed to origin)
- **Status**: All SDK (12/12) and Server (26/26) tests are passing.
- **Type Health**: `deno check` passes monorepo-wide.

## Major Changes

### 1. SDK Infrastructure Pillarization
The `packages/worlds/src/` directory has been reorganized into two primary "pillars" to reduce root-level clutter:
- **`src/core/`**: Foundations (ontology, types, internal context, factory).
- **`src/worlds/`**: High-level SDK implementations (`LocalWorlds`, `RemoteWorlds`, and the `Worlds` entry point).

### 2. Bridge Logic Relocation
HTTP-facilitating utilities were identified as "Bridge" logic that belongs to the server implementation rather than the core SDK. These have been relocated to `packages/server/src/utils/`:
- **`http/etag.ts`**: ETag handling and response optimization.
- **`http/negotiation.ts`**: RDF content negotiation.
- **`errors/errors.ts`**: `ErrorResponse` utility.

### 3. Test Co-location
Adopted a strategy of co-locating unit tests with their respective modules (e.g., `src/worlds/local.test.ts`) to improve developer ergonomics and maintainability.

---

## SDK Module Architecture

The following table summarizes the responsibilities of the newly organized modules:

| Module | Responsibility | Primary Content |
| :--- | :--- | :--- |
| **`core/`** | **Foundational Layer** | Shared DNA (ontology, types, engine-context). |
| **`worlds/`** | **Orchestration Layer** | Public-facing SDK classes and primary orchestration. |
| **`storage/`** | **Infrastructure Layer** | Database lifecycle (SQLite/libSQL Persistence Drivers). |
| **`world/`** | **Data Domain Layer** | Specialized SQL repositories (triples, chunks, blobs). |
| **`rdf/`** | **Protocol Layer** | SPARQL engine and RDF format translation. |
| **`plugins/`** | **Extension Layer** | System extensions (Registry for multi-tenancy). |
| **`schemas/`** | **Validation Layer** | Zod schemas for all interface boundaries. |
| **`embeddings/`** | **Cognitive Layer** | Vector strategies (Ollama, OpenRouter). |

## Next Steps / Brainstorming
- **Registry Integration**: Further optimize the `plugins/registry` logic to handle more complex multi-tenancy scenarios.
- **Domain Refinement**: Evaluate if further sub-domains in `world/` need isolation (e.g., separating vector search from triple storage more strictly).
- **CLI Convergence**: Update the CLI to use the new `worlds/` orchestration layer instead of raw repositories where appropriate.
