"""Question answering over the graph, with cited sources."""

import json
import re

from .. import llm
from ..catalog import Catalog
from . import context, document_impact, text2cypher

MAX_ROWS = 50

SYSTEM = """You answer questions from E80's IT department using only the context given: the result of a graph query and numbered source excerpts.
- Always answer in English, regardless of the language of the question or sources. Be concise and concrete.
- Preserve source entity names, codes, document titles and verbatim quotations in their original language.
- Cite excerpts with [n] right after the sentence they support.
- Graph rows have no number; state facts from them plainly.
- If the context does not answer the question, say so. Do not guess."""


def ask(question: str, groups: list[str]) -> dict:
    if impact := document_impact.answer_if_applicable(question, groups):
        return impact
    # Activities are many and long: the query matches them by name instead.
    catalog = Catalog.load().subset(lambda e: e.label != "Activity")
    cypher, result, error = text2cypher.run(question, catalog.text())
    sources = context.gather(question, result.nodes.keys(), groups)
    rows = json.dumps(result.rows[:MAX_ROWS], ensure_ascii=False, default=str)
    content = f"""Question: {question}

Graph query:
{cypher or "(none)"}

Graph rows ({len(result.rows)} rows, at most {MAX_ROWS} shown):
{rows}

Source excerpts:
{context.render(sources)}"""
    answer = llm.text(SYSTEM, content)
    cited = _cited(answer, max_source=len(sources))
    for source in sources:
        source["cited"] = source["n"] in cited
    return {
        "answer": answer,
        "cypher": cypher,
        "cypher_error": error,
        "rows": result.rows,
        "graph": result.graph(),
        "sources": sources,
    }


def _cited(answer: str, max_source: int = 1000) -> set[int]:
    """Source numbers cited in the answer: [2], [1, 3], [4-6]."""
    cited = set()
    for group in re.findall(r"\[([\d\s,\-–]+)\]", answer):
        for start, end in re.findall(r"(\d+)(?:\s*[-–]\s*(\d+))?", group):
            cited.update(range(max(0, int(start)), min(int(end or start), max_source) + 1))
    return cited
