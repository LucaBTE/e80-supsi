"""Document generation from the neighbourhood of one entity, with cited sources."""

from . import db, llm, schema
from .retrieval import context

DOC_TYPES = {
    "impact": "Impact assessment of a change to {target}. Sections: summary; affected processes and activities; "
              "systems and business objects; projects and requirements; people and departments to involve; "
              "open issues and risks.",
    "as_is": "AS-IS analysis of {target}. Sections: purpose and scope; current flow; roles and systems; "
             "data handled; known issues.",
    "feasibility": "Feasibility analysis of a change to {target}. Sections: context; dependencies; technical "
                   "constraints; organizational impact; risks; open questions; recommendation.",
    "work_plan": "Work plan for a change to {target}. Sections: goals; phases (opening, design, build, UAT, "
                 "cutover, closure) with activities; people and departments; dependencies; risks.",
}

SYSTEM = """You write IT documentation for E80 Group from a knowledge graph and numbered source excerpts.
- Write Markdown with the requested sections, in the requested language.
- Use only facts from the context. Cite excerpts with [n] right after the sentence they support.
- Where the context has no information for a section, say what is missing instead of inventing it."""


def neighbourhood(label: str, key: str) -> db.GraphResult:
    """The entity and everything up to two hops away, without the source layer."""
    if label not in schema.DOMAIN_LABELS:
        raise ValueError(f"unknown label {label!r}")
    return db.read_graph(
        f"""
        MATCH (n:{label} {{{schema.key_of(label)}: $key}})
        OPTIONAL MATCH p = (n)-[*1..2]-(m)
        WHERE none(x IN nodes(p) WHERE x:Chunk OR x:Document OR x:Source)
        RETURN n, p
        """,
        {"key": key},
        limit=300,
    )


def generate(doc_type: str, label: str, key: str, groups: list[str], language: str = "Italian") -> dict:
    result = neighbourhood(label, key)
    if not result.rows:
        raise LookupError(f"{label} {key!r} not found")
    target = f"{label} '{key}'"
    sources = context.gather(key, result.nodes.keys(), groups, limit=20)
    content = f"""Write this document in {language}:
{DOC_TYPES[doc_type].format(target=target)}

Graph around {target}:
{chr(10).join(result.triples()) or "(no relationships)"}

Source excerpts:
{context.render(sources)}"""
    markdown = llm.text(SYSTEM, content)
    return {"markdown": markdown, "graph": result.graph(), "sources": sources}
