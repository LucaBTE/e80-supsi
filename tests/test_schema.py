import asyncio

from neo4j_graphrag.components.graph_pruning import GraphPruning
from neo4j_graphrag.components.types import Neo4jGraph, Neo4jNode

from e80kb import schema


def test_extraction_keeps_project_code_and_declared_properties():
    graph = schema.graph_schema()
    nodes = {node.label: node for node in graph.node_types}

    assert {p.name for p in nodes["Project"].properties} == {"name", "code", "status"}
    assert {p.name for p in nodes["Requirement"].properties} == {"id", "title", "priority", "status"}
    assert {p.name for p in nodes["TestCase"].properties} == {"id", "title", "result", "date"}
    assert all(not node.additional_properties for node in nodes.values())


def test_pruning_preserves_extracted_project_code():
    graph = Neo4jGraph(nodes=[Neo4jNode(
        id="project", label="Project",
        properties={"name": "Example", "code": "173", "status": "Active", "unknown": "discard"},
    )])

    result = asyncio.run(GraphPruning().run(graph, schema.graph_schema()))

    assert result.graph.nodes[0].properties == {"name": "Example", "code": "173", "status": "Active"}
