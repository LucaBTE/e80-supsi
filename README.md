# e80-supsi
GraphRAG system for E80: documents become a Neo4j knowledge graph, questions in natural language become Cypher, answers cite their sources.


## Setup

### Neo4j

```bash
docker run -d \
    --name e80-neo4j \
    --restart always \
    --publish=127.0.0.1:7474:7474 --publish=127.0.0.1:7687:7687 \
    --volume=e80-neo4j-data:/data \
    --env NEO4J_AUTH=neo4j/change-this-password \
    --env NEO4J_PLUGINS='["apoc"]' \
    neo4j:2026.10.0
```

Replace `change-this-password` with your password and use the same value for `NEO4J_PASSWORD` in `.env`. Wait for Neo4j to finish starting; its browser is at http://localhost:7474. APOC is required: neo4j-graphrag uses it to write relationships and merge duplicates.

The named volume preserves the database when the container is removed. To restart an existing container, use `docker start e80-neo4j`.

Optional test seed (the reset statement is commented out; enabling it deletes the whole database):

```bash
docker cp seed.cypher e80-neo4j:/tmp/
docker exec e80-neo4j cypher-shell -u neo4j -p <password> -f /tmp/seed.cypher
```

### Python

Needs Python 3.12 or newer and [uv](https://docs.astral.sh/uv/).

```bash
uv sync
cp .env.example .env    # then fill in NEO4J_PASSWORD and MISTRAL_API_KEY
```

Settings come from `.env` in the working directory or from the environment; the environment wins. Create your Mistral API key in [Mistral Studio](https://console.mistral.ai/).

When migrating an existing `.env`, replace `GOOGLE_API_KEY` with `MISTRAL_API_KEY` and set `E80KB_MODEL=mistral-small-latest` (or another Mistral model available to your account). Run `uv sync` again to install the Mistral SDK.

| Variable | Default | Meaning |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j address |
| `NEO4J_USER` | `neo4j` | |
| `NEO4J_PASSWORD` | empty | empty = no auth (test instances only) |
| `MISTRAL_API_KEY` | | Mistral API key |
| `E80KB_MODEL` | `mistral-small-latest` | Mistral model for every LLM step |
| `E80KB_GROUPS` | `Internal` | ACL groups every request reads with (no login yet) |

## Usage

```bash
uv run e80kb init                     # constraints and indexes
uv run e80kb ingest data              # whole data folder; unchanged files are skipped
uv run e80kb ingest data --no-llm     # paths, chunks and spreadsheet rows only, no cost
uv run e80kb ask "Chi devo coinvolgere per una modifica a Salesforce?"
uv run e80kb doc impact System Salesforce
uv run e80kb serve                    # HTTP API, docs at http://127.0.0.1:8000/docs
uv run pytest
```

### Start the backend

Run these commands from the repository root after configuring `.env` and starting Neo4j:

```bash
uv run e80kb init
uv run e80kb serve --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/docs for the interactive API. In another terminal, check database connectivity:

```bash
curl http://127.0.0.1:8000/health
```

The root URL redirects to `/docs`. A successful startup means the HTTP server is running; `/health` checks Neo4j connectivity. HTTP 503 with "Neo4j authentication failed" means you must set `NEO4J_PASSWORD` to the actual database password. An empty password only works when Neo4j authentication is disabled. Changing `NEO4J_AUTH` does not reset the password of an existing database volume.

LLM endpoints return HTTP 429 with `Retry-After` when Mistral rate limits persist after retries, HTTP 503 when the API key is missing, and HTTP 502 for other generation failures. Check your Mistral quota if rate limits persist.

To populate the graph, put your documents under `data/` and run `uv run e80kb ingest data`. Alternatively, use the seed instructions above on a disposable database. Ingestion with extraction, `/ask` and `/documents` require a valid `MISTRAL_API_KEY`; `init`, `/health`, graph browsing and `ingest --no-llm` do not.

For development with automatic reload, use `uv run uvicorn e80kb.api:app --reload`. There is no frontend in this repository.

Always ingest from the same root: document ids are paths relative to it. `--prune` deletes documents whose file is gone.

## How it works

Built on [neo4j-graphrag](https://neo4j.com/docs/neo4j-graphrag-python/) with Mistral. Graph layout and keys live in `src/e80kb/schema.py`. Two layers: domain nodes (projects, processes, systems, people, ...) labelled `__Entity__`, and the lexical graph of neo4j-graphrag: `(Chunk)-[:FROM_DOCUMENT]->(Document)`, `(Chunk)-[:NEXT_CHUNK]->(Chunk)`, `(entity)-[:FROM_CHUNK]->(Chunk)`.

**Ingestion** (`src/e80kb/ingest/`)

1. `classify`: the path gives source, project, phase, process code and ACL. No LLM.
2. `parse`: PDF pages, Word sections, slides, spreadsheet rows, Markdown sections become chunks with a location (`loc`).
3. `extract`: neo4j-graphrag's extractor reads each chunk with the document context and returns entities and relationships bound to the schema. Invalid extraction responses fail the file so it can be retried; they are not marked as completed. Keys are mapped to canonical names (`aliases.py`, word order), then the library writes them.
4. `load`: links from the path (source, project, process hierarchy) and requirement and test rows. No LLM.
5. At the end, neo4j-graphrag merges nodes with the same label and key.

**Retrieval** (`src/e80kb/retrieval/`)

1. `text2cypher`: Mistral writes one Cypher query from the question, the schema and the catalog of known entities.
2. `guard`: static checks restrict generated queries, which run in a read transaction with a timeout. Read access mode routes transactions; it is not an authorization boundary. On query error, one retry with the error message.
3. `context`: chunks the result entities come from, plus a full-text match, filtered by `Document.acl`.
4. `ask`: Mistral answers from rows and excerpts, citing `[n]`.

`docgen` writes impact, AS-IS, feasibility and work-plan documents from the two-hop neighbourhood of one entity.

## Limits

- No login yet: everyone reads with `E80KB_GROUPS`.
- Neo4j Community has no fine-grained access control. `guard` keeps generated Cypher away from documents and chunks; titles of restricted documents could still leak through crafted label-free queries.
- Images, videos and `.loop` files are skipped. Data tables (not requirement or test sheets) are stored as a 20-row sample.
- Search on chunks is full-text only (no embeddings yet).
- When a file changes, its document and chunks are replaced, but facts extracted from the old version stay: relationships carry no chunk reference.
- Extraction reads PDF text, not the diagram image: lanes and flow of process maps are rebuilt from text only.
- Aliases are curated by hand in `src/e80kb/aliases.py`.
