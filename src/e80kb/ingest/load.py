"""Deterministic writes around the neo4j-graphrag graph: links from the path and spreadsheet rows.

Documents and chunks are written by `extract.write`. When a file changes, its
document and chunks are deleted and written again; facts extracted from the
old version stay on their entities (relationships carry no chunk reference).
"""

from collections import defaultdict

from .. import db, schema
from .classify import DocMeta, process_lineage
from .parse import Chunk

# Record property -> words that identify its column header
RECORD_FIELDS = {
    "title": ("title", "titolo"),
    "priority": ("priority", "priorit"),
    "status": ("status", "stato"),
    "result": ("test result", "esito"),
}


def stored_hash(path: str) -> str | None:
    rows = db.read("MATCH (d:Document {path: $path}) RETURN d.sha256 AS sha", path=path)
    return rows[0]["sha"] if rows else None


def mark_done(path: str, sha: str) -> None:
    """Store the file hash: the next run skips the file while it is unchanged."""
    db.write("MATCH (d:Document {path: $path}) SET d.sha256 = $sha", path=path, sha=sha)


def forget(path: str) -> None:
    """Delete a document and its chunks."""
    db.write(
        """
        MATCH (d:Document {path: $path})
        OPTIONAL MATCH (c:Chunk)-[:FROM_DOCUMENT]->(d)
        DETACH DELETE c, d
        """,
        path=path,
    )


def link_document(meta: DocMeta) -> None:
    """Source, project and process of a written document, from its path."""

    def work(tx):
        tx.run(
            "MATCH (d:Document {path: $path}) MERGE (s:Source {name: $source}) MERGE (d)-[:FROM]->(s)",
            path=meta.path, source=meta.source,
        )
        if meta.project:
            tx.run(
                """
                MATCH (d:Document {path: $path})
                MERGE (p:Project {name: $project}) SET p:__Entity__
                MERGE (d)-[:ABOUT]->(p)
                """,
                path=meta.path, project=meta.project,
            )
        if meta.process:
            tx.run(
                """
                MATCH (d:Document {path: $path})
                MERGE (p:Process {code: $code}) SET p:__Entity__, p.name = coalesce(p.name, $name)
                MERGE (d)-[:ABOUT]->(p)
                """,
                path=meta.path, code=meta.process, name=meta.process_name,
            )
            for child, rel, parent in process_lineage(meta.process):
                rel = next(t for t, a, b in schema.RELATIONS if t == rel and a == b == "Process")
                tx.run(
                    f"""
                    MERGE (c:Process {{code: $child}}) SET c:__Entity__
                    MERGE (p:Process {{code: $parent}}) SET p:__Entity__
                    MERGE (c)-[:{rel}]->(p)
                    """,
                    child=child, parent=parent,
                )

    db.write_tx(work)


def write_records(meta: DocMeta, ids: list[str], chunks: list[Chunk]) -> None:
    """Requirement and test rows of a project spreadsheet become nodes, no LLM needed."""
    if not meta.project:
        return
    rows = defaultdict(list)
    for chunk_id, chunk in zip(ids, chunks):
        if not chunk.record:
            continue
        record_id = next(iter(chunk.record.values()))
        kind = schema.RECORD_KINDS.get(record_id.split("-")[0])
        if kind:
            rows[kind].append({"id": record_id, "props": _record_props(chunk.record), "chunk": chunk_id})

    def work(tx):
        for (label, rel), batch in rows.items():
            tx.run(
                f"""
                MATCH (p:Project {{name: $project}})
                UNWIND $rows AS row
                MERGE (n:{label} {{id: coalesce(p.code, p.name) + '/' + row.id}})
                SET n:__Entity__, n += row.props
                MERGE (p)-[:{rel}]->(n)
                WITH n, row
                MATCH (c:Chunk {{id: row.chunk}})
                MERGE (n)-[:FROM_CHUNK]->(c)
                """,
                project=meta.project, rows=batch,
            )

    if rows:
        db.write_tx(work)


def _record_props(record: dict[str, str]) -> dict[str, str]:
    props = {}
    for prop, words in RECORD_FIELDS.items():
        for header, value in record.items():
            if any(word in header.lower() for word in words):
                props[prop] = value
                break
    if "title" not in props and len(record) > 1:
        props["title"] = list(record.values())[1]
    return props
