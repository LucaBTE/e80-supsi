# e80-supsi
GraphRAG system for E80: documents become a Neo4j knowledge graph, questions in natural language become Cypher, answers cite their sources.


## Setup

### Neo4j

```bash
docker run -d \
    --name e80-neo4j \
    --restart always \
    --publish=7474:7474 --publish=7687:7687 \
    --volume=/path/to/your/data:/data \
    --env NEO4J_PLUGINS='["apoc"]' \
    neo4j:2026.10.0
```

Default password: `neo4j`. APOC is required: neo4j-graphrag uses it to write relationships and merge duplicates.

Test seed (WARNING, removes ALL ENTRIES):

```bash
docker cp seed.cypher e80-neo4j:/tmp/
docker exec e80-neo4j cypher-shell -u neo4j -p <password> -f /tmp/seed.cypher
```

### Python

Needs [uv](https://docs.astral.sh/uv/).

```bash
uv sync
cp .env.example .env    # then fill in NEO4J_PASSWORD and GOOGLE_API_KEY
```

Settings come from `.env` in the working directory or from the environment; the environment wins.

| Variable | Default | Meaning |
|---|---|---|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j address |
| `NEO4J_USER` | `neo4j` | |
| `NEO4J_PASSWORD` | empty | empty = no auth (test instances only) |
| `GOOGLE_API_KEY` | | Gemini API key |
| `E80KB_MODEL` | `gemini-3.1-flash-lite` | Gemini model for every LLM step |
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

Always ingest from the same root: document ids are paths relative to it. `--prune` deletes documents whose file is gone.

## How it works

Built on [neo4j-graphrag](https://neo4j.com/docs/neo4j-graphrag-python/) with Gemini. Graph layout and keys live in `src/e80kb/schema.py`. Two layers: domain nodes (projects, processes, systems, people, ...) labelled `__Entity__`, and the lexical graph of neo4j-graphrag: `(Chunk)-[:FROM_DOCUMENT]->(Document)`, `(Chunk)-[:NEXT_CHUNK]->(Chunk)`, `(entity)-[:FROM_CHUNK]->(Chunk)`.

**Ingestion** (`src/e80kb/ingest/`)

1. `classify`: the path gives source, project, phase, process code and ACL. No LLM.
2. `parse`: PDF pages, Word sections, slides, spreadsheet rows, Markdown sections become chunks with a location (`loc`).
3. `extract`: neo4j-graphrag's extractor reads each chunk with the document context and returns entities and relationships bound to the schema. Keys are mapped to canonical names (`aliases.py`, word order), then the library writes them.
4. `load`: links from the path (source, project, process hierarchy) and requirement and test rows. No LLM.
5. At the end, neo4j-graphrag merges nodes with the same label and key.

**Retrieval** (`src/e80kb/retrieval/`)

1. `text2cypher`: Gemini writes one Cypher query from the question, the schema and the catalog of known entities.
2. `guard`: the query must stay in the domain layer; it runs in a read transaction with a timeout. On error, one retry with the error message.
3. `context`: chunks the result entities come from, plus a full-text match, filtered by `Document.acl`.
4. `ask`: Gemini answers from rows and excerpts, citing `[n]`.

`docgen` writes impact, AS-IS, feasibility and work-plan documents from the two-hop neighbourhood of one entity.

## Limits

- No login yet: everyone reads with `E80KB_GROUPS`.
- Neo4j Community has no fine-grained access control. `guard` keeps generated Cypher away from documents and chunks; titles of restricted documents could still leak through crafted label-free queries.
- Images, videos and `.loop` files are skipped. Data tables (not requirement or test sheets) are stored as a 20-row sample.
- Search on chunks is full-text only (no embeddings yet).
- When a file changes, its document and chunks are replaced, but facts extracted from the old version stay: relationships carry no chunk reference.
- Extraction reads PDF text, not the diagram image: lanes and flow of process maps are rebuilt from text only.
- Aliases are curated by hand in `src/e80kb/aliases.py`.
