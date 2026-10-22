"""Find documents to review when a source document changes."""

import re
from pathlib import PurePosixPath
from urllib.parse import urlencode

from .. import db


def answer_if_applicable(question: str, groups: list[str]) -> dict | None:
    """Use explicit provenance links for document-change questions, without an LLM."""
    lower = question.lower()
    if not (any(word in lower for word in ("change", "modif", "update")) and
            any(word in lower for word in ("document", "file"))):
        return None

    documents = db.read(
        "MATCH (d:Document) WHERE d.acl IN $groups "
        "RETURN d.id AS id, d.title AS title, d.path AS path ORDER BY d.id LIMIT 2000",
        groups=groups,
    )
    # A full file name or id disambiguates revisions that share a display title.
    keys = [(key.lower(), document) for document in documents
            for key in (document["id"], PurePosixPath(document["path"]).name, document["title"])
            if key and key.lower() in lower]
    if not keys:
        return None
    _, source = max(keys, key=lambda pair: len(pair[0]))
    source_id = source["id"]
    candidates: dict[str, dict] = {}

    def add(row: dict, reason: str, scope: str, rank: int) -> None:
        if row["id"] == source_id:
            return
        previous = candidates.get(row["id"])
        if previous is None or rank > previous["rank"]:
            candidates[row["id"]] = {**row, "reason": reason, "scope": scope, "rank": rank}

    for row in db.read(
        "MATCH (source:Document {id:$id})-[:NEW_REV_OF]-(other:Document) "
        "WHERE source.acl IN $groups AND other.acl IN $groups "
        "RETURN DISTINCT other.id AS id, other.title AS title, other.path AS path",
        id=source_id, groups=groups,
    ):
        add(row, "explicit document revision", "direct", 3)

    for row in db.read(
        "MATCH (source:Document {id:$id})<-[:FROM_DOCUMENT]-(:Chunk)<-[:FROM_CHUNK]-(entity)"
        "-[:FROM_CHUNK]->(:Chunk)-[:FROM_DOCUMENT]->(other:Document) "
        "WHERE source.acl IN $groups AND other.acl IN $groups AND other <> source "
        "RETURN DISTINCT other.id AS id, other.title AS title, other.path AS path, "
        "coalesce(entity.name, entity.code, entity.id) AS shared LIMIT 100",
        id=source_id, groups=groups,
    ):
        add(row, f"shared entity: {row['shared']}", "indirect", 2)

    for row in db.read(
        "MATCH (source:Document {id:$id})-[:ABOUT]->(subject)<-[:ABOUT]-(other:Document) "
        "WHERE source.acl IN $groups AND other.acl IN $groups AND other <> source "
        "RETURN DISTINCT other.id AS id, other.title AS title, other.path AS path, "
        "coalesce(subject.name, subject.code, subject.id) AS shared LIMIT 100",
        id=source_id, groups=groups,
    ):
        add(row, f"same subject: {row['shared']}", "indirect", 1)

    ordered = sorted(candidates.values(), key=lambda item: (-item["rank"], item["path"]))
    selected = [source, *ordered]
    nodes = [{"id": item["id"], "labels": ["Document"], "properties": {
        "id": item["id"], "name": PurePosixPath(item["path"]).name,
        "title": item["title"], "path": item["path"],
    }} for item in selected]
    relationships = [{"id": f"review:{item['id']}", "type": "REVIEW_CANDIDATE",
                      "start": source_id, "end": item["id"], "properties": {
                          "reason": item["reason"], "scope": item["scope"],
                      }} for item in ordered]
    sources = []
    for item in selected:
        rows = db.read(
            "MATCH (c:Chunk)-[:FROM_DOCUMENT]->(d:Document {id:$id}) "
            "WHERE d.acl IN $groups RETURN c.id AS chunk, d.id AS document_id, "
            "d.title AS document, d.path AS path, c.loc AS loc, c.text AS text "
            "ORDER BY c.index LIMIT 1",
            id=item["id"], groups=groups,
        )
        if rows:
            sources.append({"n": len(sources) + 1, **rows[0],
                            "url": "/api/sources/document?" + urlencode({"id": item["id"]})})

    name = PurePosixPath(source["path"]).name
    if ordered:
        lines = [f"If **{name}** changes, review these linked documents:"]
        lines.extend(f"- **{PurePosixPath(item['path']).name}** — {item['reason']}."
                     for item in ordered)
        lines.append("\nThese are review candidates based on recorded links; the graph does not prove that their contents must change.")
    else:
        lines = [f"No other documents are linked to **{name}** in the available graph."]
    return {"answer": "\n\n".join([lines[0], "\n".join(lines[1:])]),
            "cypher": "", "cypher_error": None, "rows": [],
            "graph": {"nodes": nodes, "relationships": relationships},
            "sources": sources, "root_document_id": source_id}
