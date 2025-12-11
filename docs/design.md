# Worlds API - Design Document

## Overview

The Worlds API is a powerful RDF data management platform that provides:

- **RDF Store Management**: Create, read, update, and delete RDF data stores
- **SPARQL Support**: Execute SPARQL queries and updates against stores
- **Account Management**: Multi-tenant architecture with access control
- **Usage Tracking**: Per-store usage metrics and analytics
- **TypeScript SDK**: Type-safe client libraries for Node.js and Deno

---

## Architecture

### Technology Stack

- **Runtime**: Deno
- **Storage**: Deno KV (key-value store)
- **RDF Engine**: Oxigraph (embedded RDF database)
- **Routing**: @fartlabs/rt (lightweight router)
- **Authentication**: Bearer token authentication
- **SDK**: TypeScript with full type safety

### Project Structure

```
src/
├── accounts/                    # Account management
│   ├── accounts-service.ts      # Account service interface
│   ├── authorize.ts             # Authentication & authorization
│   ├── usage.ts                 # Usage tracking utilities
│   └── deno-kv/                 # Deno KV implementation
│       └── deno-kv-accounts-service.ts
├── oxigraph/                    # RDF store management
│   ├── oxigraph-service.ts      # Oxigraph service interface
│   ├── oxigraph-encoding.ts     # RDF format encoding/decoding
│   └── deno-kv/                 # Deno KV implementation
│       └── deno-kv-oxigraph-service.ts
├── v1/                          # API v1
│   ├── routes/                  # API routes
│   │   ├── stores/              # Store management routes
│   │   │   ├── route.ts
│   │   │   └── sparql/          # SPARQL query routes
│   │   │       └── route.ts
│   │   ├── accounts/            # Account management routes
│   │   │   └── route.ts
│   │   └── usage/               # Usage tracking routes
│   │       └── route.ts
│   ├── sdk/                     # TypeScript SDK
│   │   ├── worlds.ts            # Public SDK
│   │   ├── internal-worlds.ts   # Admin SDK
│   │   └── mod.ts               # SDK exports
│   └── openapi.json             # OpenAPI specification
└── main.ts                      # Application entry point
```

---

## API Endpoints

### Stores

#### `GET /v1/stores/{storeId}`

Retrieve RDF data from a store.

**Headers:**

- `Accept`: RDF format (application/n-quads, application/ld+json, text/turtle,
  application/trig)

**Response:** RDF data in requested format

#### `GET /v1/stores/{storeId}/metadata`

Get metadata about a store.

**Response:**

```json
{
  "id": "my-store",
  "tripleCount": 1234,
  "size": 45678,
  "createdAt": 1702345678000,
  "updatedAt": 1702345678000
}
```

#### `PUT /v1/stores/{storeId}`

Create or replace a store with RDF data.

**Headers:**

- `Content-Type`: RDF format

**Body:** RDF data

#### `POST /v1/stores/{storeId}`

Add RDF quads to an existing store.

**Headers:**

- `Content-Type`: RDF format

**Body:** RDF data to add

#### `DELETE /v1/stores/{storeId}`

Remove a store and all its data.

---

### SPARQL

#### `GET /v1/stores/{storeId}/sparql?query={sparql}`

Execute a SPARQL query via GET.

**Query Parameters:**

- `query`: SPARQL query string

**Response:**

```json
[
  { "s": { "value": "http://example.com/s" }, "p": {...}, "o": {...} }
]
```

#### `POST /v1/stores/{storeId}/sparql`

Execute a SPARQL query or update.

**Headers:**

- `Content-Type`: application/sparql-query or application/sparql-update

**Body:** SPARQL query or update

**Response:**

- Query: JSON array of results
- Update: 204 No Content

---

### Accounts

#### `GET /v1/accounts`

List all accounts (admin only).

**Response:**

```json
[
  {
    "id": "account-1",
    "description": "Production account",
    "plan": "pro_plan",
    "accessControl": {
      "stores": ["*"]
    }
  }
]
```

#### `POST /v1/accounts`

Create a new account (admin only).

**Request Body:**

```json
{
  "id": "new-account",
  "description": "New account",
  "plan": "free_plan",
  "accessControl": {
    "stores": ["store-1", "store-2"]
  }
}
```

#### `GET /v1/accounts/{accountId}`

Retrieve account details (admin only).

#### `PUT /v1/accounts/{accountId}`

Update an existing account (admin only).

#### `DELETE /v1/accounts/{accountId}`

Remove an account (admin only).

---

### Usage

#### `GET /v1/usage`

Get usage summary for the authenticated account.

**Query Parameters (admin only):**

- `accountId`: Account ID to query

**Response:**

```json
{
  "stores": {
    "store-1": {
      "reads": 456,
      "writes": 123,
      "queries": 89,
      "updates": 12,
      "updatedAt": 1702345678000
    }
  }
}
```

---

## Authentication & Authorization

### Authentication

The API uses Bearer token authentication:

```
Authorization: Bearer {account-id}
```

For admin operations, use the `ADMIN_ACCOUNT_ID` environment variable value.

### Authorization Model

#### Admin Users

- Account ID matches `ADMIN_ACCOUNT_ID` environment variable
- Full access to all resources
- Can manage accounts
- Can view any account's usage

#### Regular Users

- Account ID is their API key
- Access controlled by `accessControl.stores` array
- Access controlled by `accessControl.stores` array
- Specific store IDs limit access to those stores only

### Access Control Flow

```typescript
interface AuthorizedRequest {
  admin: boolean; // Is this an admin user?
  account?: Account; // Account object (null for admin)
}

// Authorization check
const authorized = await authorizeRequest(accountsService, request);

if (!authorized) {
  return new Response("Unauthorized", { status: 401 });
}

// Admin-only operation
if (!authorized.admin) {
  return new Response("Unauthorized", { status: 401 });
}

// Store access check
if (
  !authorized.admin &&
  !authorized.account?.accessControl.stores.includes(storeId)
) {
  return new Response("Unauthorized", { status: 401 });
}
```

---

## Data Models

### Account

```typescript
interface Account {
  id: string; // Unique account identifier (also the API key)
  description: string; // Human-readable description
  plan: AccountPlan; // "free_plan" | "pro_plan"
  accessControl: {
    stores: string[]; // Store IDs
  };
}
```

### Account Plans

```typescript
const plans = {
  free_plan: {
    stores: 100, // Max 100 stores
  },
  pro_plan: {
    stores: 1_000_000, // Max 1M stores
  },
};
```

### Store Metadata

```typescript
interface StoreMetadata {
  id: string; // Store identifier
  tripleCount: number; // Number of RDF triples
  size: number; // Size in bytes
  createdAt: number; // Unix timestamp (ms)
  updatedAt: number; // Unix timestamp (ms)
}
```

### Usage Summary

```typescript
interface AccountUsageSummary {
  stores: {
    [storeId: string]: StoreUsageSummary;
  };
}

interface StoreUsageSummary {
  reads: number; // GET /stores/{id}
  writes: number; // PUT, POST, DELETE /stores/{id}
  queries: number; // GET /stores/{id}/sparql
  updates: number; // POST /stores/{id}/sparql (update)
  updatedAt: number; // Unix timestamp (ms)
}
```

---

## TypeScript SDK

### Installation

```bash
# Deno
import { Worlds, InternalWorlds } from "jsr:@fartlabs/worlds";

# Node.js
npm install @fartlabs/worlds
```

### Worlds SDK (Public)

For regular users to interact with their stores.

```typescript
import { Worlds } from "@fartlabs/worlds";

const client = new Worlds({
  baseUrl: "https://worlds.deno.dev/v1",
  apiKey: "your-account-id",
});

// Get store metadata
const metadata = await client.getStoreMetadata("my-store");

// Get store data
const data = await client.getStore("my-store", "application/n-quads");

// Create/replace store
await client.setStore("my-store", rdfData, "application/n-quads");

// Add quads to store
await client.addQuads("my-store", moreData, "application/n-quads");

// Execute SPARQL query
const results = await client.query("my-store", "SELECT * WHERE { ?s ?p ?o }");

// Execute SPARQL update
await client.update("my-store", "INSERT DATA { <s> <p> <o> }");

// Delete store
await client.removeStore("my-store");

// Get usage summary
const usage = await client.getUsage();
```

### InternalWorlds SDK (Admin)

For platform owners to manage accounts and resources.

```typescript
import { InternalWorlds } from "@fartlabs/worlds";

const admin = new InternalWorlds({
  baseUrl: "https://worlds.deno.dev/v1",
  apiKey: process.env.ADMIN_ACCOUNT_ID,
});

// List all accounts
const accounts = await admin.listAccounts();

// Create account
await admin.createAccount({
  id: "new-user",
  description: "New user account",
  plan: "free_plan",
  accessControl: { stores: [] },
});

// Get account
const account = await admin.getAccount("user-id");

// Update account
await admin.updateAccount({
  ...account,
  plan: "pro_plan",
});

// Delete account
await admin.removeAccount("user-id");

// Get account usage
const usage = await admin.getAccountUsage("user-id");
```

---

## RDF Format Support

### Supported Formats

| Format  | MIME Type             | Extension |
| ------- | --------------------- | --------- |
| N-Quads | `application/n-quads` | .nq       |
| JSON-LD | `application/ld+json` | .jsonld   |
| Turtle  | `text/turtle`         | .ttl      |
| TriG    | `application/trig`    | .trig     |

### Content Negotiation

Use the `Accept` header to specify desired format:

```bash
# Get store as N-Quads
curl -H "Accept: application/n-quads" \
     -H "Authorization: Bearer account-id" \
     https://worlds.deno.dev/v1/stores/my-store

# Get store as JSON-LD
curl -H "Accept: application/ld+json" \
     -H "Authorization: Bearer account-id" \
     https://worlds.deno.dev/v1/stores/my-store
```

---

## Usage Tracking

### Tracked Operations

| Operation | Metric    | Endpoint                          |
| --------- | --------- | --------------------------------- |
| Read      | `reads`   | GET /stores/{id}                  |
| Write     | `writes`  | PUT /stores/{id}                  |
| Write     | `writes`  | POST /stores/{id}                 |
| Write     | `writes`  | DELETE /stores/{id}               |
| Query     | `queries` | GET /stores/{id}/sparql           |
| Update    | `updates` | POST /stores/{id}/sparql (update) |

### Usage Event Flow

```typescript
// 1. Request comes in
const request = new Request(...);

// 2. Process request
const response = await handleRequest(request);

// 3. Record usage event
await accountsService.meter({
  id: crypto.randomUUID(),
  accountId: "user-id",
  timestamp: Date.now(),
  endpoint: "GET /stores/{storeId}",
  params: { storeId: "my-store" },
  statusCode: 200
});

// 4. Usage summary is updated
// stores.my-store.reads += 1
// stores.my-store.updatedAt = Date.now()
```

---

## Storage Architecture

### Deno KV Key Structure

```
# Accounts
["accounts", accountId] -> Account

# Account Usage Summary
["accounts", accountId, "usage_summary"] -> AccountUsageSummary

# Stores
["stores", storeId] -> Uint8Array (compressed RDF data)
```

### Data Compression

All RDF stores are compressed using gzip before storage:

```typescript
// Encoding
const stream = encodeStore(store, "application/n-quads");
const compressed = stream.pipeThrough(new CompressionStream("gzip"));
const bytes = await toArrayBuffer(compressed);
await kv.set(["stores", storeId], new Uint8Array(bytes));

// Decoding
const { value } = await kv.get(["stores", storeId]);
const decompressed = ReadableStream.from([value])
  .pipeThrough(new DecompressionStream("gzip"));
const store = await decodeStore(decompressed, "application/n-quads");
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning               | When                                           |
| ---- | --------------------- | ---------------------------------------------- |
| 200  | OK                    | Successful GET/query                           |
| 201  | Created               | Account created                                |
| 204  | No Content            | Successful PUT/POST/DELETE/update              |
| 400  | Bad Request           | Invalid input, malformed RDF                   |
| 401  | Unauthorized          | Missing/invalid auth, insufficient permissions |
| 404  | Not Found             | Store/account doesn't exist                    |
| 500  | Internal Server Error | Unexpected error                               |

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

---

## Environment Variables

### Required

```bash
# Admin account ID for owner operations
ADMIN_ACCOUNT_ID=admin-account-id
```

### Optional

```bash
# Server port (default: 8000)
PORT=8000

# Deno KV database path (default: in-memory)
DENO_KV_PATH=./data/kv.db
```

---

## Development

### Running Locally

```bash
# Start development server
deno task dev

# Run tests
deno task test

# Format code
deno task fmt

# Lint code
deno task lint

# Run all checks
deno task precommit
```

### Testing

```bash
# Run all tests
deno test -A --unstable-kv --env-file=.env.example

# Run specific test file
deno test -A --unstable-kv src/v1/routes/stores/route.test.ts

# Watch mode
deno test -A --unstable-kv --watch
```

### Creating a Test Account

```typescript
import { InternalWorlds } from "./src/v1/sdk/internal-worlds.ts";

const admin = new InternalWorlds({
  baseUrl: "http://localhost:8000/v1",
  apiKey: Deno.env.get("ADMIN_ACCOUNT_ID")!,
});

await admin.createAccount({
  id: "test-user",
  description: "Test account",
  plan: "free_plan",
  accessControl: { stores: [] },
});

console.log("API Key:", "test-user");
```

---

## Deployment

### Deno Deploy

```bash
# Install deployctl
deno install -Arf jsr:@deno/deployctl

# Deploy
deployctl deploy --project=worlds-api src/main.ts
```

### Environment Setup

1. Set `ADMIN_ACCOUNT_ID` in Deno Deploy dashboard
2. Configure custom domain (optional)
3. Enable automatic deployments from GitHub

---

## Security Best Practices

### API Keys

- **Never commit** API keys to version control
- **Store securely** in environment variables
- **Rotate regularly** for production accounts
- **Use separate keys** for dev/staging/production

### Access Control

- **Principle of least privilege**: Grant minimum necessary access
- **Wildcard carefully**: Use `["*"]` only when truly needed
- **Audit regularly**: Review account permissions periodically

### Rate Limiting

Consider implementing rate limiting for production:

```typescript
// Example rate limit middleware
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(accountId: string): boolean {
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit = 100; // 100 requests per minute

  const requests = rateLimiter.get(accountId) || [];
  const recent = requests.filter((t) => now - t < window);

  if (recent.length >= limit) {
    return false;
  }

  recent.push(now);
  rateLimiter.set(accountId, recent);
  return true;
}
```

---

## Performance Optimization

### Caching

Consider caching frequently accessed stores:

```typescript
const cache = new Map<string, { store: Store; expires: number }>();

async function getCachedStore(id: string): Promise<Store | null> {
  const cached = cache.get(id);
  if (cached && Date.now() < cached.expires) {
    return cached.store;
  }

  const store = await oxigraphService.getStore(id);
  if (store) {
    cache.set(id, {
      store,
      expires: Date.now() + 60_000, // 1 minute TTL
    });
  }

  return store;
}
```

### Compression

All stores are automatically compressed with gzip, reducing storage by ~70-90%
for typical RDF data.

---

## Future Enhancements

### Planned Features

1. **Batch Operations**
   - Bulk store creation/deletion
   - Batch SPARQL queries

2. **Webhooks**
   - Store update notifications
   - Usage threshold alerts

3. **Advanced Analytics**
   - Query performance metrics
   - Storage usage trends
   - Popular query patterns

4. **Graph Visualization**
   - Interactive RDF graph explorer
   - Query result visualization

5. **Backup & Export**
   - Scheduled backups
   - Full account export
   - Point-in-time recovery

---

## API Versioning

The API uses URL-based versioning (`/v1/`). Future versions will be introduced
as `/v2/`, `/v3/`, etc., with:

- **Backward compatibility** maintained for at least 12 months
- **Deprecation notices** provided 6 months in advance
- **Migration guides** for breaking changes

---

## Support & Resources

- **Documentation**: https://worlds.deno.dev/docs
- **OpenAPI Spec**: `/v1/openapi.json`
- **GitHub**: https://github.com/fartlabs/worlds-api
- **Issues**: https://github.com/fartlabs/worlds-api/issues

---

## License

MIT License - see LICENSE file for details.
