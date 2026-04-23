# Worlds Python SDK

A lightweight, type-safe Python SDK for the Worlds platform.

## Installation

```bash
# Using uv (Recommended)
uv add "git+https://github.com/wazootech/worlds.git#subdirectory=packages/python-sdk"

# Using standard pip
pip install "git+https://github.com/wazootech/worlds.git#subdirectory=packages/python-sdk"

# Pin a specific version by adding @tag (e.g. @v1.0.0)
uv add "git+https://github.com/wazootech/worlds.git@v1.0.0#subdirectory=packages/python-sdk"
```

## Usage

```python
from worlds.client import Client

# Initialize the client
client = Client()
```
