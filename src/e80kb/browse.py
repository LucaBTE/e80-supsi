"""Bounded domain graph for the frontend catalogs, without LLM requests."""

from . import db, schema
from .retrieval import context


def catalog(groups: list[str], limit: int = 1000) -> dict:
    result = db.read_graph(
        """
        MATCH (n:__Entity__)
        WHERE any(label IN labels(n) WHERE label IN $labels)
        WITH n ORDER BY elementId(n) LIMIT $fetch_limit
        WITH collect(n) AS matches
        RETURN matches[..$limit] AS nodes, size(matches) > $limit AS truncated
        """,
        {"labels": list(schema.DOMAIN_LABELS), "limit": limit, "fetch_limit": limit + 1},
    )
    ids = list(result.nodes)
    truncated = bool(result.rows and result.rows[0]["truncated"])
    if ids:
        edges = db.read_graph(
            """
            MATCH (n)-[r]->(m)
            WHERE elementId(n) IN $ids AND elementId(m) IN $ids AND type(r) IN $types
            WITH r ORDER BY elementId(r) LIMIT 5001
            WITH collect(r) AS matches
            RETURN matches[..5000] AS relationships, size(matches) > 5000 AS truncated
            """,
            {"ids": ids, "types": list(schema.RELATION_TYPES)},
        )
        result.relationships.update(edges.relationships)
        truncated |= bool(edges.rows and edges.rows[0]["truncated"])
    sources = context.gather("", ids, groups, limit=100) if ids else []
    return {"graph": result.graph(), "sources": sources, "truncated": truncated}
