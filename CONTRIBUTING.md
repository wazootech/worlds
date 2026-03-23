# Contributing to Worlds

This guide explains how to configure your environment, run the Worlds monorepo
locally, and submit pull requests.

## Quick start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Deno** (>= 2.x) - Our primary runtime and task runner
- **Node.js & npm** - Required for some packages (Console and Docs)
- **Git** for version control

### Setting up the development environment

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/wazootech/worlds.git
   cd worlds
   ```

2. **Install dependencies**

   ```bash
   deno task install
   ```

3. **Start the development server**

   ```bash
   deno task start:server
   ```

   This will start the Worlds API server. The web console can be started with
   `deno task start`.

## Project structure

Worlds is organized as a monorepo:

```
worlds-api/
├── packages/
│   ├── ai-sdk/      # AI SDK for tool-calling and context injection
│   ├── cli/         # Command-line interface for Worlds
│   ├── console/     # Next.js web application for managing world models
│   ├── docs/        # Documentation site (Mintlify-based)
│   ├── sdk/         # Core TypeScript SDK for the Worlds API
│   └── server/      # The core Worlds API server
├── deno.json        # Root task and workspace configuration
└── README.md        # Project overview
```

## Development workflow

### Available tasks

- `deno task start:server` - Start the core API server
- `deno task start:docs` - Start the documentation development server
- `deno task test` - Run all tests across the workspace
- `deno task lint` - Lint all code
- `deno task fmt` - Format all code
- `deno task precommit` - Run all checks (format, lint, check, test) before
  committing

### Code quality

Before submitting a Pull Request, ensure your code passes all checks:

```bash
deno task precommit
```

## Coding standards

- Use **TypeScript** for all new code.
- Follow the existing code style and patterns (Deno defaults).
- Use `deno fmt` for consistent formatting.
- Add descriptive JSDoc comments to public functions and classes.
- Ensure all new features are covered by tests.

## Pull request process

1. **Create a branch**: Use descriptive names like `feat/new-reasoning-engine`
   or `fix/sparql-parser-bug`.
2. **Commit often**: Write clear, concise commit messages.
3. **Open a PR**: Address the PR template requirements and provide a clear
   summary of your changes.
4. **Reviews**: All PRs require at least one maintainer review before merging.

## Community guidelines

- Be respectful and inclusive.
- Focus on constructive feedback.
- Maintain professionalism in all interactions.
