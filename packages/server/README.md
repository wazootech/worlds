# Worlds Platform™ Server

[![JSR](https://jsr.io/badges/@wazoo/worlds-server)](https://jsr.io/@wazoo/worlds-server)

**Worlds Platform™ Server** is the core REST API implementation for managing,
querying, and reasoning over context graphs. It is built with
[Deno](https://deno.land/) and leverages high-performance libraries for RDF
operations and vector embeddings.

## Key Features

- **SPARQL Support**: Comprehensive support for querying and updating RDF data
  using [Comunica](https://comunica.dev/) and
  [N3](https://github.com/rdfjs/N3.js).
- **Vector Embeddings**: Intelligent search and reasoning powered by
  [TensorFlow.js](https://www.tensorflow.org/js) and
  [Google Generative AI](https://ai.google.dev/).
- **Edge-Ready**: Designed to run efficiently at the edge.
- **Persistence**: Backed by [LibSQL](https://github.com/libsql/libsql) for
  reliable data storage.

## Local Database Structure

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
    └── wazoo/                 # SQLite storage for 'wazoo' (auto-generated)
        ├── worlds.db          # Main server database 
        └── worlds/            # Base directory for world-specific databases
            ├── 01JJB2RQX3P5K9F6.db
            └── 01JJB2RQY7H2M1N4.db
```

This isolation ensures that world-specific operations (like SPARQL updates or
log rotation) do not affect the main server registry or other worlds.

## Getting Started

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

- **Start Development Server**: `deno task start`
- **Generate SQL Schemas**: `deno task generate`

## API Reference

The API follows a standard RESTful structure under the `/v1` prefix.

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
