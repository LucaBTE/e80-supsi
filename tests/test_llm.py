import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from neo4j_graphrag.exceptions import LLMGenerationError

from e80kb import config, llm
from e80kb.catalog import Catalog
from e80kb.ingest import extract
from e80kb.ingest.classify import classify
from e80kb.ingest.parse import Chunk


@pytest.fixture(autouse=True)
def reset_client():
    llm.client.cache_clear()
    yield
    llm.client.cache_clear()


def response(content):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))], usage=None,
    )


@pytest.mark.parametrize("key", [None, "", "   "])
def test_missing_mistral_key_has_clear_error(monkeypatch, key):
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
    monkeypatch.setenv("GOOGLE_API_KEY", "unused-google-key")
    if key is not None:
        monkeypatch.setenv("MISTRAL_API_KEY", key)

    with pytest.raises(ValueError, match="MISTRAL_API_KEY is required"):
        llm.client()


def test_text_uses_mistral_model_and_system_instruction(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "test-mistral-key")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setattr(config, "MODEL", "custom-mistral-model")
    client = llm.client()
    complete = Mock(return_value=response("Answer [1]."))
    monkeypatch.setattr(client.client.chat, "complete", complete)

    assert llm.text("Use only the sources.", "Question") == "Answer [1]."
    assert llm.client() is client
    kwargs = complete.call_args.kwargs
    assert kwargs["model"] == "custom-mistral-model"
    assert [(m["role"], m["content"]) for m in kwargs["messages"]] == [
        ("system", "Use only the sources."), ("user", "Question"),
    ]


def test_extraction_uses_async_mistral_and_preserves_project_code(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "test-mistral-key")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    client = llm.client()
    complete = AsyncMock(return_value=response(
        '{"nodes": [{"id": "0", "label": "Project", '
        '"properties": {"name": "Demo", "code": "173"}}], "relationships": []}'
    ))
    monkeypatch.setattr(client.client.chat, "complete_async", complete)

    graph = asyncio.run(extract.build(
        classify("Projects/Demo/notes.md"), [Chunk("Project Demo, code 173.", "body")], Catalog([]), True,
    ))

    complete.assert_awaited_once()
    assert complete.call_args.kwargs["model"] == config.MODEL
    project = next(n for n in graph.nodes if n.label == "Project")
    assert project.properties["name"] == "Demo"
    assert project.properties["code"] == "173"
    assert any(r.type == "FROM_CHUNK" for r in graph.relationships)


def test_no_llm_ingestion_does_not_need_api_key(monkeypatch):
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)

    graph = asyncio.run(extract.build(
        classify("Projects/Demo/notes.md"), [Chunk("Example", "body")], Catalog([]), False,
    ))

    assert {n.label for n in graph.nodes} == {"Document", "Chunk"}


def test_malformed_extraction_is_not_treated_as_success(monkeypatch):
    monkeypatch.setenv("MISTRAL_API_KEY", "test-mistral-key")
    complete = AsyncMock(return_value=response('{"nodes": "invalid"}'))
    monkeypatch.setattr(llm.client().client.chat, "complete_async", complete)

    with pytest.raises(LLMGenerationError):
        asyncio.run(extract.build(
            classify("Projects/Demo/notes.md"), [Chunk("Example", "body")], Catalog([]), True,
        ))
