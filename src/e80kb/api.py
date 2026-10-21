"""HTTP API for the web interface.

No login yet: every request reads with config.DEFAULT_GROUPS.
"""

import re
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from . import config, db, docgen, schema
from .retrieval.ask import ask

app = FastAPI(title="E80 Knowledge API")

DomainLabel = Literal[schema.DOMAIN_LABELS]


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class DocRequest(BaseModel):
    type: Literal[tuple(docgen.DOC_TYPES)]
    label: DomainLabel
    key: str = Field(min_length=1, max_length=300)
    language: Literal["Italian", "English"] = "Italian"


@app.get("/health")
def health() -> dict:
    db.driver().verify_connectivity()
    return {"status": "ok"}


@app.post("/ask")
def ask_endpoint(request: AskRequest) -> dict:
    return ask(request.question, config.DEFAULT_GROUPS)


@app.get("/graph/search")
def search(q: str = Query(min_length=2, max_length=200), limit: int = Query(20, ge=1, le=100)) -> list[dict]:
    """Entities whose name, code or id matches the words of `q` (prefix match)."""
    terms = " ".join(f"{word}*" for word in re.findall(r"\w+", q.lower())[:10])
    if not terms:
        return []
    rows = db.read(
        """
        MATCH (n)
        SEARCH n IN (FULLTEXT INDEX entity_names FOR $terms LIMIT $limit) SCORE AS score
        RETURN [l IN labels(n) WHERE l IN $labels][0] AS label, properties(n) AS props, score
        """,
        terms=terms, limit=limit, labels=list(schema.DOMAIN_LABELS),
    )
    return [
        {
            "label": row["label"],
            "key": row["props"].get(schema.key_of(row["label"])),
            "name": row["props"].get(schema.NAME_PROPS.get(row["label"], "name")),
            "score": row["score"],
        }
        for row in rows
    ]


@app.get("/graph/node")
def node(label: DomainLabel, key: str = Query(min_length=1, max_length=300)) -> dict:
    """One entity with its direct neighbours in the domain graph."""
    result = db.read_graph(
        f"""
        MATCH (n:{label} {{{schema.key_of(label)}: $key}})
        OPTIONAL MATCH (n)-[r]-(m) WHERE NOT (m:Chunk OR m:Document OR m:Source)
        RETURN n, r, m
        """,
        {"key": key},
    )
    if not result.rows:
        raise HTTPException(404, f"{label} {key!r} not found")
    return result.graph()


@app.post("/documents")
def generate_doc(request: DocRequest) -> dict:
    try:
        return docgen.generate(request.type, request.label, request.key, config.DEFAULT_GROUPS, request.language)
    except LookupError as e:
        raise HTTPException(404, str(e))
