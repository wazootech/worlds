# Worlds Platform™ CLI

[![JSR](https://jsr.io/badges/@wazoo/cli)](https://jsr.io/@wazoo/cli)

**Worlds Platform™ CLI** is a command-line tool for managing your Worlds
Platform™ instances. It provides a convenient way to interact with worlds,
organizations, and invites directly from your terminal.

## Usage

```sh
deno -A jsr:@wazoo/cli [command] [options]
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
