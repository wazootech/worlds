# Worlds Platform™ CLI

[![JSR](https://jsr.io/badges/@wazoo/worlds-cli)](https://jsr.io/@wazoo/worlds-cli)

**Worlds Platform™ CLI** is a command-line tool for managing your Worlds
Platform™ instances. It provides a convenient way to interact with worlds,
organizations, and invites directly from your terminal.

## Usage

```sh
deno -A jsr:@wazoo/worlds-cli [command] [options]
```

### Commands

- **create**: Create a new world.
- **list**: List all available worlds.
- **get**: Get details of a specific world.
- **update**: Update an existing world's metadata.
- **delete**: Remove a world.
- **search**: Search for patterns within a world's knowledge graph.
- **sparql**: Query a world using SPARQL.
- **import/export**: Move data in and out of a world.
- **chat**: Start an interactive chat with an AI assistant in a world.

### Environment Variables

The CLI can operate in two modes: **Remote** (connecting to an existing server)
or **Local** (running an in-process server).

#### Remote Mode

Used when connecting to a hosted Worlds API instance.

- **WORLDS_BASE_URL**: (Required) The base URL of the Worlds API (e.g.,
  `https://api.wazoo.dev`).
- **WORLDS_API_KEY**: (Required) Your Worlds API key.

#### Local Mode

Used to run a local, in-process server using your machine's resources.

- **LIBSQL_URL**: (Required) Connection string for the local database (e.g.,
  `file:./worlds.db`).
- **GOOGLE_API_KEY**: (Required) API key for high-quality Gemini embeddings.
- **WORLDS_API_KEY**: (Optional) API key for administrative access.

#### AI Chat (Required for `chat` command)

- **OPENROUTER_API_KEY**: (Required) Your OpenRouter API key.
- **OPENROUTER_MODEL**: (Optional) The OpenRouter model ID to use (default:
  `google/gemini-2.0-flash-001`).

### Examples

#### Create a World

```sh
worlds create --label "My First World"
```

Output:

```json
{
  "id": "01KH6XAGQKJ1B9MR6WS76YKQK5",
  "organizationId": null,
  "label": "My First World",
  "description": null,
  "createdAt": 1770832347891,
  "updatedAt": 1770832347891,
  "deletedAt": null
}
```

#### List Worlds

```sh
worlds list
```

Output:

```json
[
  {
    "id": "01KH6XAGQKJ1B9MR6WS76YKQK5",
    "organizationId": null,
    "label": "My First World",
    "description": null,
    "createdAt": 1770832347891,
    "updatedAt": 1770832347891,
    "deletedAt": null
  }
]
```

#### Update a World

```sh
worlds update 01KH6XAGQKJ1B9MR6WS76YKQK5 --label "Updated Label"
```

Output:

```text
Updated world 01KH6XAGQKJ1B9MR6WS76YKQK5
```

---

Developed with 🧪 [**@wazootech**](https://github.com/wazootech)
