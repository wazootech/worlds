# Worlds Platform™ Server

[![JSR](https://jsr.io/badges/@wazoo/server)](https://jsr.io/@wazoo/server)

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
deno -A jsr:@wazoo/server [command]
```

### Tasks

- **Start Development Server**: `deno task start`
- **Generate SQL Schemas**: `deno task generate`

## API Reference

The API follows a standard RESTful structure under the `/v1` prefix.

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
