import asyncio
from unittest.mock import AsyncMock, Mock

import pytest

from e80kb import cli
from e80kb.ingest.pipeline import ingest
from e80kb.ingest import pipeline


def test_missing_root_cannot_prune(tmp_path):
    with pytest.raises(ValueError, match="not a directory"):
        ingest(tmp_path / "missing", use_llm=False, prune=True)


@pytest.mark.parametrize("workers", [0, -1])
def test_invalid_workers(tmp_path, workers):
    with pytest.raises(ValueError, match="workers"):
        ingest(tmp_path, workers=workers, use_llm=False)


def test_cli_rejects_invalid_root_before_database_access(tmp_path, monkeypatch):
    init = Mock()
    monkeypatch.setattr(cli.db, "init_schema", init)
    monkeypatch.setattr("sys.argv", ["e80kb", "ingest", str(tmp_path / "missing"), "--prune"])

    with pytest.raises(SystemExit) as exc:
        cli.main()

    assert exc.value.code == 2
    init.assert_not_called()


def test_extraction_failure_keeps_existing_document_and_hash(tmp_path, monkeypatch):
    path = tmp_path / "notes.md"
    path.write_text("Example text")
    monkeypatch.setattr(pipeline.load, "stored_hash", Mock(return_value="old-hash"))
    monkeypatch.setattr(pipeline.Catalog, "load", Mock(return_value=Mock()))
    monkeypatch.setattr(pipeline.extract, "build", AsyncMock(side_effect=ValueError("Invalid extraction")))
    forget, mark_done = Mock(), Mock()
    monkeypatch.setattr(pipeline.load, "forget", forget)
    monkeypatch.setattr(pipeline.load, "mark_done", mark_done)

    result = asyncio.run(pipeline._ingest_file(tmp_path, path, True, False, asyncio.Lock()))

    assert result == "failed"
    forget.assert_not_called()
    mark_done.assert_not_called()


def test_cli_returns_failure_status_when_ingestion_has_errors(tmp_path, monkeypatch):
    monkeypatch.setattr("sys.argv", ["e80kb", "ingest", str(tmp_path)])
    monkeypatch.setattr(cli.db, "init_schema", Mock())
    monkeypatch.setattr(cli.aliases, "load", Mock())
    monkeypatch.setattr(pipeline, "ingest", Mock(return_value={"failed": 1, "ingested": 2}))

    with pytest.raises(SystemExit) as exc:
        cli.main()

    assert exc.value.code == 1
