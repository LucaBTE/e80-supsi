from unittest.mock import Mock

from e80kb import browse, db, schema


def test_catalog_empty_database_skips_edges_and_sources(monkeypatch):
    read = Mock(return_value=db.GraphResult(rows=[{"nodes": [], "truncated": False}]))
    gather = Mock()
    monkeypatch.setattr(browse.db, "read_graph", read)
    monkeypatch.setattr(browse.context, "gather", gather)
    assert browse.catalog(["Internal"]) == {"graph": {"nodes": [], "relationships": []}, "sources": [], "truncated": False}
    assert read.call_count == 1
    gather.assert_not_called()


def test_catalog_restricts_domain_types_and_preserves_acl_sources(monkeypatch):
    node = {"id": "project", "labels": ["Project"], "properties": {"name": "Example"}}
    result = db.GraphResult(rows=[{"truncated": True}], nodes={"project": node})
    edges = db.GraphResult(rows=[{"truncated": False}])
    read = Mock(side_effect=[result, edges])
    sources = [{"n": 1, "entities": ["project"], "text": "Example"}]
    gather = Mock(return_value=sources)
    monkeypatch.setattr(browse.db, "read_graph", read)
    monkeypatch.setattr(browse.context, "gather", gather)
    output = browse.catalog(["Internal"], limit=1)
    assert output["graph"]["nodes"] == [node]
    assert output["sources"] == sources
    assert output["truncated"] is True
    assert read.call_args_list[0].args[1]["labels"] == list(schema.DOMAIN_LABELS)
    assert read.call_args_list[1].args[1]["types"] == list(schema.RELATION_TYPES)
    gather.assert_called_once_with("", ["project"], ["Internal"], limit=100)
