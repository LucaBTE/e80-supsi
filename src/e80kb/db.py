"""Neo4j access: driver, schema setup and read/write helpers."""

from dataclasses import dataclass, field
from functools import cache

from neo4j import GraphDatabase, RoutingControl, unit_of_work
from neo4j.graph import Node, Path, Relationship

from . import config, schema

_SOURCE_LABELS = frozenset(schema.SOURCE_LABELS)


@cache
def driver():
    auth = (config.NEO4J_USER, config.NEO4J_PASSWORD) if config.NEO4J_PASSWORD else None
    return GraphDatabase.driver(
        config.NEO4J_URI,
        auth=auth,
        # Skip info notes and "unknown label/property" warnings, normal on a young graph.
        notifications_min_severity="WARNING",
        notifications_disabled_classifications=["UNRECOGNIZED"],
    )


def read(query: str, **params) -> list[dict]:
    records = driver().execute_query(query, params, routing_=RoutingControl.READ).records
    return [record.data() for record in records]


def write(query: str, **params) -> None:
    driver().execute_query(query, params)


def write_tx(work):
    """Run `work(tx)` in one write transaction and return its result."""
    with driver().session() as session:
        return session.execute_write(work)


def init_schema() -> None:
    # neo4j-graphrag writes a new node per extraction and merges duplicates afterwards,
    # so domain keys get indexes, not uniqueness constraints.
    for row in read("SHOW CONSTRAINTS YIELD name, labelsOrTypes WHERE labelsOrTypes[0] IN $labels RETURN name",
                    labels=list(schema.DOMAIN_LABELS)):
        name = row["name"].replace("`", "``")
        write(f"DROP CONSTRAINT `{name}`")
    for label in schema.DOMAIN_LABELS:
        write(f"CREATE INDEX {label.lower()}_key IF NOT EXISTS FOR (n:{label}) ON (n.{schema.key_of(label)})")
    for label in schema.SOURCE_LABELS:
        write(f"CREATE CONSTRAINT {label.lower()}_{schema.key_of(label)} IF NOT EXISTS FOR (n:{label}) REQUIRE n.{schema.key_of(label)} IS UNIQUE")
    write("CREATE CONSTRAINT document_path IF NOT EXISTS FOR (n:Document) REQUIRE n.path IS UNIQUE")
    # Hand-made domain nodes (seed, manual edits) join entity resolution too.
    write(
        "MATCH (n) WHERE any(l IN labels(n) WHERE l IN $labels) AND NOT n:__Entity__ SET n:__Entity__",
        labels=list(schema.DOMAIN_LABELS),
    )
    write("CREATE FULLTEXT INDEX chunk_text IF NOT EXISTS FOR (n:Chunk) ON EACH [n.text]")
    labels = "|".join(schema.DOMAIN_LABELS)
    write(f"CREATE FULLTEXT INDEX entity_names IF NOT EXISTS FOR (n:{labels}) ON EACH [n.name, n.code, n.id, n.title]")
    write("CALL db.awaitIndexes(300)")


@dataclass
class GraphResult:
    """Records of a read query, with the domain subgraph they touch."""

    rows: list[dict] = field(default_factory=list)
    nodes: dict[str, dict] = field(default_factory=dict)  # elementId -> node
    relationships: dict[str, dict] = field(default_factory=dict)  # elementId -> relationship

    def graph(self) -> dict:
        return {"nodes": list(self.nodes.values()), "relationships": list(self.relationships.values())}

    def triples(self) -> list[str]:
        """Relationships as readable lines for prompts."""
        lines = []
        for rel in self.relationships.values():
            start, end = self.nodes.get(rel["start"]), self.nodes.get(rel["end"])
            if start and end:
                props = f" {rel['properties']}" if rel["properties"] else ""
                lines.append(f"({_display(start)})-[:{rel['type']}{props}]->({_display(end)})")
        return lines


def read_graph(query: str, params: dict | None = None, timeout: float = 10.0, limit: int = 200) -> GraphResult:
    """Run a query in a read transaction and convert at most `limit` records.

    Source-layer nodes (documents, chunks) are dropped: they carry ACLs and are
    read only through `retrieval.context`.
    """

    @unit_of_work(timeout=timeout)
    def work(tx):
        result = GraphResult()
        for record in tx.run(query, params or {}).fetch(limit):
            result.rows.append({k: _convert(v, result) for k, v in record.items()})
        return result

    with driver().session() as session:
        return session.execute_read(work)


def _convert(value, result: GraphResult):
    if isinstance(value, Node):
        return _node(value, result)
    if isinstance(value, Relationship):
        return _relationship(value, result)
    if isinstance(value, Path):
        if any(set(n.labels) & _SOURCE_LABELS for n in value.nodes):
            return None
        return {
            "nodes": [_node(n, result) for n in value.nodes],
            "relationships": [_relationship(r, result) for r in value.relationships],
        }
    if isinstance(value, list):
        return [_convert(v, result) for v in value]
    if isinstance(value, dict):
        return {k: _convert(v, result) for k, v in value.items()}
    if hasattr(value, "iso_format"):  # neo4j.time types
        return value.iso_format()
    return value


def _node(node: Node, result: GraphResult) -> dict | None:
    labels = sorted(label for label in node.labels if label not in schema.INTERNAL_LABELS)
    if set(labels) & _SOURCE_LABELS:
        return None
    props = {k: _convert(v, result) for k, v in node.items()}
    if labels:  # relationship endpoints come without labels unless the query returned them
        result.nodes[node.element_id] = {"id": node.element_id, "labels": labels, "properties": props}
    return {"_labels": labels, **props}


def _relationship(rel: Relationship, result: GraphResult) -> dict | None:
    if rel.type in schema.SOURCE_RELATIONS or any(
        n is not None and set(n.labels) & _SOURCE_LABELS for n in rel.nodes
    ):
        return None
    props = {k: _convert(v, result) for k, v in rel.items()}
    result.relationships[rel.element_id] = {
        "id": rel.element_id,
        "type": rel.type,
        "start": rel.start_node.element_id,
        "end": rel.end_node.element_id,
        "properties": props,
    }
    for endpoint in rel.nodes:
        _node(endpoint, result)
    return {"_type": rel.type, **props}


def _display(node: dict) -> str:
    label = node["labels"][0]
    props = node["properties"]
    key = props.get(schema.key_of(label)) if label in schema.NODES else None
    name = props.get(schema.NAME_PROPS.get(label, ""))
    return f"{label} {key!r}" + (f" '{name}'" if name and name != key else "")
