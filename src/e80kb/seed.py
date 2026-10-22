"""Load the prebuilt sample graph into Neo4j without ingestion or LLM calls."""

import re
from pathlib import Path

from . import aliases, db

_TOKENS = re.compile(
    r"(?P<comment>//[^\n]*|/\*.*?\*/)"
    r"|(?P<string>'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|`(?:[^`]|``)*`)"
    r"|(?P<separator>;)", re.S,
)


def statements(text: str) -> list[str]:
    """Split trusted Cypher statements, preserving semicolons inside literals."""
    result, parts, start = [], [], 0
    for token in _TOKENS.finditer(text):
        parts.append(text[start:token.start()])
        if token.lastgroup == "comment":
            parts.append(" ")
        elif token.lastgroup == "separator":
            if statement := "".join(parts).strip():
                result.append(statement)
            parts = []
        else:
            parts.append(token.group())
        start = token.end()
    parts.append(text[start:])
    if statement := "".join(parts).strip():
        result.append(statement)
    return result


def load_seed(path: Path) -> dict:
    queries = statements(path.read_text(encoding="utf-8"))
    if not queries:
        raise ValueError(f"Seed file is empty: {path}")
    db.init_schema()
    schema_queries = [q for q in queries if re.match(r"CREATE\s+(CONSTRAINT|INDEX)\b", q, re.I)]
    data_queries = [q for q in queries if q not in schema_queries]
    for query in schema_queries:
        db.write(query)

    def work(tx):
        for query in data_queries:
            tx.run(query).consume()

    db.write_tx(work)
    aliases.load()
    return {key: db.read(query)[0][key] for key, query in {
        "nodes": "MATCH (n) RETURN count(n) AS nodes",
        "relationships": "MATCH ()-[r]->() RETURN count(r) AS relationships",
        "documents": "MATCH (d:Document) RETURN count(d) AS documents",
        "chunks": "MATCH (c:Chunk) RETURN count(c) AS chunks",
    }.items()}
