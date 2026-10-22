"""Source excerpts behind an answer, filtered by the caller's ACL groups."""

import re

from .. import db

_FIELDS = "c.id AS chunk, d.title AS document, d.path AS path, c.loc AS loc, c.text AS text"


def gather(question: str, node_ids, groups: list[str], limit: int = 12) -> list[dict]:
    """Chunks the result entities come from, then chunks that match the question words.

    `node_ids` are element ids of the nodes in the graph result.
    """
    rows = []
    if node_ids:
        rows += db.read(
            f"""
            MATCH (n)-[:FROM_CHUNK]->(c:Chunk)-[:FROM_DOCUMENT]->(d:Document)
            WHERE elementId(n) IN $ids AND d.acl IN $groups
            WITH d, c, count(n) AS hits ORDER BY hits DESC LIMIT $limit
            RETURN {_FIELDS}
            """,
            ids=list(node_ids), groups=groups, limit=limit,
        )
    if terms := _terms(question):
        rows += db.read(
            f"""
            CALL db.index.fulltext.queryNodes('chunk_text', $terms)
            YIELD node AS c, score
            MATCH (c)-[:FROM_DOCUMENT]->(d:Document)
            WHERE d.acl IN $groups
            WITH d, c, score ORDER BY score DESC LIMIT 5
            RETURN {_FIELDS}
            """,
            terms=terms, groups=groups,
        )

    sources, seen = [], set()
    for row in rows:
        if row["chunk"] not in seen and len(sources) < limit:
            seen.add(row["chunk"])
            sources.append({"n": len(sources) + 1, **row})
    return sources


def render(sources: list[dict]) -> str:
    if not sources:
        return "(no sources)"
    return "\n\n".join(f"[{s['n']}] {s['document']} - {s['loc']}\n{s['text']}" for s in sources)


def _terms(question: str) -> str:
    # Lowercase plain words only: no Lucene operators or special characters.
    return " ".join(re.findall(r"\w{3,}", question.lower())[:20])
