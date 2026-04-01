# MCP Server Refactor - Handoff Memo

## Current Status

The refactor to per-tool modules is partially complete but blocked by Deno
cache/import resolution issues.

## What Was Done

### 1. Created new tool module directories (complete)

Each tool now lives in its own directory with co-located schema and
implementation:

```
packages/ai-sdk/src/tools/
├── execute-sparql/
│   ├── mod.ts          # barrel re-exports
│   ├── schema.ts       # input/output Zod types
│   └── index.ts        # tool definition + factory
├── search-entities/
│   ├── mod.ts
│   ├── schema.ts
│   └── index.ts
├── worlds-list/
├── worlds-get/
├── worlds-create/
├── worlds-import/
└── worlds-export/
```

### 2. Updated ai-sdk exports (complete)

- `packages/ai-sdk/deno.json` - updated exports to point to new modules
- `packages/ai-sdk/src/mod.ts` - re-exports from new tool directories

### 3. Updated MCP route (complete)

- `packages/server/src/routes/mcp/route.ts` - imports from new tool modules

## The Problem

Deno is caching old export maps. When importing from
`@wazoo/worlds-ai-sdk/tools/execute-sparql`, it's resolving to the OLD files
(`./tools/execute-sparql.ts` instead of `./tools/execute-sparql/index.ts`).

**Error**: `Unknown export './tools/worlds-list' for '@wazoo/worlds-ai-sdk'`

Even though `deno.json` exports are correct, the cache is serving stale data.

## Remaining Work

### 1. Delete old files (critical)

```bash
# Delete old flat files (NOT directories)
rm packages/ai-sdk/src/tools/execute-sparql.ts
rm packages/ai-sdk/src/tools/search-entities.ts
# ... etc for all tools

# Delete old directories
rm -rf packages/ai-sdk/src/schemas/
rm -rf packages/ai-sdk/src/tool-definitions/
```

### 2. Fix Deno cache (if needed)

May need to:

- Clear Deno's package cache
- Or use `--reload` flags
- Or delete `deno.lock` and regenerate

### 3. Run tests and verify

```bash
deno check packages/ai-sdk
deno check packages/server
deno test -A --reporter=dot
```

## Why This Structure

The new structure gives each tool:

- **Single source of truth** - schema + definition + implementation in one place
- **Co-location** - easy to find/edit related code
- **Explicit deps** - each tool explicitly imports what it needs
- **Scalability** - adding new tools = creating a new directory

This aligns with domain-driven design where each tool is its own bounded
context.

## Key Files

- `packages/ai-sdk/deno.json` - Export map (may need updating after old files
  deleted)
- `packages/ai-sdk/src/mod.ts` - Barrel exports
- `packages/ai-sdk/src/tools/*/mod.ts` - Tool barrel files
- `packages/server/src/routes/mcp/route.ts` - MCP implementation
