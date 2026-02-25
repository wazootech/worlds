# Worlds Platform™ SDK

[![JSR](https://jsr.io/badges/@wazoo/worlds-sdk)](https://jsr.io/@wazoo/worlds-sdk)

**Worlds Platform™ SDK** is the official TypeScript/Deno client for interacting
with the Worlds Platform™. It provides a structured, type-safe way to manage
knowledge bases, organizations, and invites.

## Installation

```sh
deno add @wazoo/worlds-sdk
```

## Usage

```typescript
import { WorldsSdk } from "@wazoo/worlds-sdk";

// Initialize the client.
const sdk = new WorldsSdk({
  baseUrl: "http://localhost:8000",
  apiKey: "your-api-key",
});

// Interact with worlds, organizations, and invites.
const world = await sdk.worlds.get("my-world-id-or-slug");
```

## Features

- **Type-safe API**: Full TypeScript definitions for all API resources.
- **Client-side Validation**: Leverages Zod for robust data handling.
- **Ease of Use**: Simplified methods for SPARQL queries, semantic search, and
  schema discovery.

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
