from pathlib import Path
from unittest.mock import Mock

import pytest
from neo4j.exceptions import AuthError
from neo4j_graphrag.exceptions import RateLimitError

from e80kb import cli, seed


def test_split_preserves_literal_semicolons_and_comment_markers():
    text = """// discarded ' ;
    MERGE (n:System {name: 'A;B', url: 'https://example.test'});
    /* a ; comment */ RETURN "x;/*y*/" AS text;
    RETURN `a;b`;
    """
    queries = seed.statements(text)
    assert len(queries) == 3
    assert "'A;B'" in queries[0] and "https://example.test" in queries[0]
    assert '"x;/*y*/"' in queries[1]
    assert queries[2] == "RETURN `a;b`"


def test_default_seed_does_not_delete_existing_data():
    queries = seed.statements((Path(__file__).resolve().parents[1] / "seed.cypher").read_text())
    assert len(queries) > 20
    assert not any("DETACH DELETE" in q for q in queries)
    assert any("FROM_CHUNK" in q for q in queries)
    assert any("FROM_DOCUMENT" in q for q in queries)


def test_seed_writes_data_in_a_single_transaction(tmp_path, monkeypatch):
    path = tmp_path / "sample.cypher"
    path.write_text("CREATE INDEX example IF NOT EXISTS FOR (n:System) ON (n.name); MERGE (:System {name:'SAP'});")
    init, write, aliases = Mock(), Mock(), Mock()
    tx = Mock()
    monkeypatch.setattr(seed.db, "init_schema", init)
    monkeypatch.setattr(seed.db, "write", write)
    monkeypatch.setattr(seed.db, "write_tx", lambda fn: fn(tx))
    monkeypatch.setattr(seed.aliases, "load", aliases)
    monkeypatch.setattr(seed.db, "read", Mock(side_effect=[[{"nodes": 1}], [{"relationships": 0}], [{"documents": 0}], [{"chunks": 0}]]))
    assert seed.load_seed(path)["nodes"] == 1
    init.assert_called_once()
    write.assert_called_once()
    assert tx.run.call_args.args[0] == "MERGE (:System {name:'SAP'})"
    tx.run.return_value.consume.assert_called_once()
    aliases.assert_called_once()


def test_cli_auth_error_has_no_traceback(monkeypatch, capsys):
    monkeypatch.setattr("sys.argv", ["e80kb", "init"])
    monkeypatch.setattr(cli.db, "init_schema", Mock(side_effect=AuthError("private details")))
    with pytest.raises(SystemExit) as exc:
        cli.main()
    assert exc.value.code == 1
    output = capsys.readouterr().err
    assert "NEO4J_PASSWORD" in output
    assert "Traceback" not in output and "private details" not in output


def test_cli_llm_rate_error_has_no_traceback(monkeypatch, capsys):
    monkeypatch.setattr("sys.argv", ["e80kb", "ask", "Example question"])
    monkeypatch.setattr("e80kb.retrieval.ask.ask", Mock(side_effect=RateLimitError("private details")))
    with pytest.raises(SystemExit):
        cli.main()
    assert "Gemini rate limit" in capsys.readouterr().err
