"""Static checks on generated Cypher before it runs.

Writes are already impossible: the query runs in a read transaction. These
checks keep generated queries inside the domain layer. The source layer
(documents and chunks) carries ACLs and is read only through `context`.
Neo4j Community has no fine-grained access control, so this is the guard.
"""

import re

from .. import schema

_STRINGS = re.compile(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"")
_COMMENTS = re.compile(r"//[^\n]*|/\*.*?\*/", re.S)
# Words that may precede "[" without being a subscript (list literals, comprehensions).
_LIST_CONTEXT = {"IN", "AND", "OR", "XOR", "NOT", "RETURN", "WITH", "WHERE", "WHEN", "THEN", "ELSE", "AS", "UNWIND", "DISTINCT"}

_CHECKS = (
    (re.compile(r"\b(CALL|LOAD|USE|SHOW|CREATE|MERGE|DELETE|DETACH|SET|REMOVE|DROP|FOREACH)\b", re.I),
     "only plain read queries are allowed"),
    # __KGBuilder__ is also on documents and chunks written by neo4j-graphrag.
    (re.compile(r"\b(" + "|".join(schema.SOURCE_LABELS + schema.SOURCE_RELATIONS + ("__KGBuilder__",)) + r")\b"),
     "documents and chunks are not queryable"),
    (re.compile(r"\.\s*(text|loc|acl|path|sha256)\b"), "source properties are not queryable"),
    (re.compile(r"\b(properties|keys)\s*\(", re.I), "dynamic property access is not allowed"),
    (re.compile(r"\{\s*\.\*"), "dynamic property access is not allowed"),
)


class GuardError(ValueError):
    pass


def check(cypher: str) -> None:
    """Raise GuardError if the query may leave the domain layer."""
    if not cypher.strip():
        raise GuardError("empty query")
    code = _COMMENTS.sub(" ", _STRINGS.sub("''", cypher))
    for pattern, message in _CHECKS:
        if m := pattern.search(code):
            raise GuardError(f"{message}: {m.group(0)!r}")
    # n['text'] or n[x]: subscripts other than list indexes and slices
    for m in re.finditer(r"([\w`)\]]+)\s*\[(?!\s*-?\d|\s*\.\.)", code):
        if m.group(1).upper() not in _LIST_CONTEXT:
            raise GuardError(f"dynamic property access is not allowed: {m.group(0)!r}")
