# Worlds Platform Server

[![JSR](https://jsr.io/badges/@wazoo/worlds-server)](https://jsr.io/@wazoo/worlds-server)

Worlds Server (a.k.a. Worlds API) is the core REST API implementation for
managing, querying, and reasoning over context graphs. It is built with
[Deno](https://deno.land/) and leverages high-performance libraries for RDF
operations and vector embeddings.

## Key features

- **SPARQL Support**: Comprehensive support for querying and updating RDF data
  using [Comunica](https://comunica.dev/) and
  [N3](https://github.com/rdfjs/N3.js).
- **Vector Embeddings**: Intelligent search and reasoning.
- **Edge-Ready**: Designed to run efficiently at the edge.
- **Persistence**: Backed by [LibSQL](https://github.com/libsql/libsql) for data
  storage.

## Local database structure

When running locally with the `FileDatabaseManager`, the server organizes data
using a two-tier SQLite structure:

- **Main Database** (`data/<org_id>/worlds.db`): Stores the control plane data,
  including the registry of all worlds managed by this server instance.
- **World Databases** (`data/<org_id>/worlds/<world_id>.db`): A dedicated SQLite
  file for each world, containing its specific triples, blobs, logs, and vector
  indexes.

By default, the local deployment orchestrator places these files in the
**Console** directory to keep the API server completely stateless during dev.

Example directory layout for an organization `wazoo`:

```text
packages/console/
└── data/
    └── wazoo/                      # SQLite storage for organization 'wazoo'
        ├── worlds.db               # Core server database
        └── worlds/                 # Base directory for world-specific databases
            ├── 01JJB2RQX3P5K9F6.db # RDF store & search index
            └── 01JJB2RQY7H2M1N4.db # RDF store & search index
```

This isolation ensures that world-specific operations (like SPARQL updates or
log rotation) do not affect the main server registry or other worlds.

## Getting started

### Prerequisites

- [Deno](https://deno.land/) installed on your system.

### Configuration

Copy `.env.example` to `.env` and provide the necessary environment variables:

```sh
cp .env.example .env
```

## Usage

```sh
deno -A jsr:@wazoo/worlds-server [command]
```

### Tasks

- **Start development server**: `deno task start`
- **Generate SQL schemas**: `deno task generate`

## API reference

The API follows a standard RESTful structure. For full details, see the
[official documentation](https://docs.wazoo.dev/reference/api).

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
