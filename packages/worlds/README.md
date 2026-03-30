# Worlds Platform SDK

[![JSR](https://jsr.io/badges/@wazoo/worlds-sdk)](https://jsr.io/@wazoo/worlds-sdk)

**Worlds Platform SDK** is the official TypeScript/Deno client for interacting
with the Worlds Platform. It provides a structured, type-safe way to manage
knowledge bases (worlds).

## Installation

```sh
deno add @wazoo/worlds-sdk
```

## Usage

```typescript
import { Worlds } from "@wazoo/worlds-sdk";

// Initialize the client.
const worlds = new Worlds({
  baseUrl: "http://localhost:8000",
  apiKey: "your-api-key",
});

// Interact with worlds.
const world = await worlds.get("my-world-id");
```

## Features

- **Type-safe API**: Full TypeScript definitions for all API resources.
- **Client-side Validation**: Leverages Zod for data handling.
- **Ease of Use**: Simplified methods for SPARQL queries, semantic search, and
  schema discovery.

For more information, see the
[official documentation](https://docs.wazoo.dev/reference/sdk-overview).

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
