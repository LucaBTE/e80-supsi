# AGENTS.md

## Language

- All code is in English: identifiers, comments, docstrings, log messages, commit messages.
- Source data in `data/` mixes Italian and English. Keep names, codes and quotes taken from it as they are: do not translate them.

## Project

- Python package in `src/e80kb/`, managed with uv: `uv sync`, `uv run pytest`.
- `src/e80kb/schema.py` is the single source of truth for labels, keys and relationship types. Change the graph model there.
- Labels and relationship types interpolated into Cypher must come from `schema.py`, never from user or LLM input.
- Graph building uses neo4j-graphrag conventions: domain nodes carry `__Entity__`, the lexical graph is `FROM_DOCUMENT` / `NEXT_CHUNK` / `FROM_CHUNK`. Domain labels have indexes, not uniqueness constraints: duplicates are merged after writing.
- Canonical names and aliases of shared entities live in `src/e80kb/aliases.py`.
