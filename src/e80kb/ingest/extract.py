"""Knowledge-graph building with neo4j-graphrag: chunks -> lexical graph and entities.

The library extracts per chunk, writes a new node per extraction and merges
duplicates afterwards (`resolve_duplicates`). Before writing, keys are mapped
to their canonical form (aliases, word order) so the merge finds them.
"""

from neo4j_graphrag.components.entity_relation_extractor import LLMEntityRelationExtractor, OnError
from neo4j_graphrag.components.graph_pruning import GraphPruning
from neo4j_graphrag.components.kg_writer import Neo4jWriter
from neo4j_graphrag.components.lexical_graph import LexicalGraphBuilder
from neo4j_graphrag.components.resolver import SinglePropertyExactMatchResolver
from neo4j_graphrag.components.types import DocumentInfo, LexicalGraphConfig, Neo4jGraph, TextChunk, TextChunks
from neo4j_graphrag.generation.prompts import ERExtractionTemplate

from .. import db, llm, schema
from ..catalog import Catalog
from .classify import DocMeta
from .parse import Chunk

LEXICAL = LexicalGraphConfig()
SCHEMA = schema.graph_schema()

# The library's default prompt, with our rules and the document context in place of examples.
TEMPLATE = """You extract information from company documents of E80 Group, written in Italian or English, to build a knowledge graph.

Extract the entities (nodes) and their type from the input text, and the relationships between them.

Return the result as JSON in this format:
{{"nodes": [ {{"id": "0", "label": "Person", "properties": {{"name": "John"}} }}],
"relationships": [{{"type": "WORKS_ON", "start_node_id": "0", "end_node_id": "1", "properties": {{"role": "PM"}} }}] }}

Use only these node types, relationship types, properties and patterns:
{schema}

Assign a unique ID (string) to each node and reuse it in relationships.
Respect the source and target node types and the direction of each relationship.

Rules:
- Every node needs its key property, in the format given in its description.
- Keep names in the language of the document. Do not translate them.
- Extract only what the text states. Extract specific things: named systems, people, roles, processes, activities, business objects. Skip generic words such as "system", "user" or "data".
- Process maps: a lane is a Role, or a System when the lane is software. Tasks are Activities linked in flow order with NEXT. A task in a software lane USES that System. A collapsed subprocess CALLS its Process.
- Output only the JSON object, without backticks or other text. Property names in double quotes.

Document context:
{examples}

Input text:

{text}
"""


def chunk_ids(doc_id: str, chunks: list[Chunk]) -> list[str]:
    return [f"{doc_id}#{index}" for index in range(1, len(chunks) + 1)]


async def build(meta: DocMeta, chunks: list[Chunk], catalog: Catalog, use_llm: bool) -> Neo4jGraph:
    """Lexical graph of the document, plus extracted entities when `use_llm`."""
    ids = chunk_ids(meta.path, chunks)
    text_chunks = TextChunks(chunks=[
        TextChunk(text=c.text, index=i, uid=chunk_id, metadata={"id": chunk_id, "loc": c.loc})
        for i, (chunk_id, c) in enumerate(zip(ids, chunks), 1)
    ])
    properties = {"id": meta.path, "title": meta.title, "type": meta.type, "format": meta.format,
                  "phase": meta.phase, "acl": meta.acl}
    document = DocumentInfo(path=meta.path, uid=meta.path, metadata={k: v for k, v in properties.items() if v})
    if not use_llm:
        return (await LexicalGraphBuilder(LEXICAL).run(text_chunks, document)).graph

    extractor = LLMEntityRelationExtractor(
        llm=llm.client(), prompt_template=ERExtractionTemplate(template=TEMPLATE), on_error=OnError.IGNORE,
    )
    graph = await extractor.run(text_chunks, document, LEXICAL, SCHEMA, examples=_context(meta, catalog))
    _canonical_keys(graph, catalog)
    return (await GraphPruning().run(graph, SCHEMA, LEXICAL)).graph


async def write(graph: Neo4jGraph) -> None:
    # Not safe to run in parallel: the writer clears temporary ids of every node it created.
    await Neo4jWriter(db.driver()).run(graph, LEXICAL)


async def resolve_duplicates() -> None:
    """Merge nodes with the same label and key (the key differs per label)."""
    for label in schema.DOMAIN_LABELS:
        await SinglePropertyExactMatchResolver(
            db.driver(), filter_query=f"WHERE entity:{label}", resolve_property=schema.key_of(label),
        ).run()


def _context(meta: DocMeta, catalog: Catalog) -> str:
    lines = [f"Path: {meta.path}", f"Document type: {meta.type}"]
    if meta.project:
        code = catalog.project_codes.get(meta.project)
        lines.append(f"Project: '{meta.project}'" + (f", code '{code}'" if code else "")
                     + ". Use this exact project name; requirement and test ids start with "
                     + f"'{code or meta.project}/'.")
    if meta.process:
        lines.append(f"Process: code '{meta.process}', name '{meta.process_name}'. Activity ids start with '{meta.process}#'.")
    return "\n".join(lines)


def _canonical_keys(graph: Neo4jGraph, catalog: Catalog) -> None:
    """Map keys to canonical form; drop entities without a key and relationships to them."""
    lexical = {LEXICAL.document_node_label, LEXICAL.chunk_node_label}
    dropped = set()
    for node in graph.nodes:
        if node.label in lexical or node.label not in schema.NODES:
            continue
        key = schema.key_of(node.label)
        value = node.properties.get(key)
        if isinstance(value, str) and value.strip():
            node.properties[key] = catalog.resolve(node.label, value)
        else:
            dropped.add(node.id)
    graph.nodes = [n for n in graph.nodes if n.id not in dropped]
    graph.relationships = [
        r for r in graph.relationships if r.start_node_id not in dropped and r.end_node_id not in dropped
    ]
