import asyncio
from unittest.mock import Mock

import httpx
import pytest
from neo4j.exceptions import AuthError, ServiceUnavailable
from neo4j_graphrag.exceptions import LLMGenerationError, RateLimitError
from tenacity import Future, RetryError

from e80kb import api, llm


def request(method, path, **kwargs):
    async def run():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=api.app), base_url="http://test",
        ) as client:
            return await client.request(method, path, **kwargs)

    return asyncio.run(run())


def test_home_redirects_to_documentation(tmp_path, monkeypatch):
    monkeypatch.setattr(api.config, "FRONTEND_DIST", tmp_path)
    response = request("GET", "/")
    assert response.status_code == 307
    assert response.headers["location"] == "/docs"
    assert request("GET", "/docs").status_code == 200
    assert request("GET", "/favicon.ico").status_code == 204


def test_home_serves_frontend_build_when_available(tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text('<html><div id="root">Frontend</div></html>')
    monkeypatch.setattr(api.config, "FRONTEND_DIST", tmp_path)
    response = request("GET", "/")
    assert response.status_code == 200
    assert 'id="root"' in response.text
    assert response.headers["cache-control"] == "no-cache"


def test_prefixed_api_and_legacy_api_share_the_same_behavior(monkeypatch):
    answer = {"answer": "Test [1].", "graph": {"nodes": [], "relationships": []}, "sources": []}
    ask = Mock(return_value=answer)
    monkeypatch.setattr(api, "ask", ask)
    for path in ("/ask", "/api/ask"):
        response = request("POST", path, json={"question": "Example question"})
        assert response.status_code == 200
        assert response.json() == answer
    assert ask.call_count == 2


def test_catalog_is_bounded_and_uses_configured_groups(monkeypatch):
    catalog = Mock(return_value={"graph": {"nodes": [], "relationships": []}, "sources": [], "truncated": False})
    monkeypatch.setattr(api.browse, "catalog", catalog)
    response = request("GET", "/api/graph/catalog", params={"limit": 50})
    assert response.status_code == 200
    catalog.assert_called_once_with(api.config.DEFAULT_GROUPS, 50)
    assert request("GET", "/api/graph/catalog", params={"limit": 2001}).status_code == 422
    assert request("GET", "/api/graph/catalog", params={"limit": 0}).status_code == 422


@pytest.mark.parametrize("error, message", [
    (AuthError("private database details"), "authentication failed"),
    (ServiceUnavailable("private host details"), "unavailable"),
])
def test_health_reports_database_failure_without_leaking_details(monkeypatch, error, message):
    monkeypatch.setattr(api.db, "driver", Mock(return_value=Mock(verify_connectivity=Mock(side_effect=error))))
    response = request("GET", "/health")
    assert response.status_code == 503
    assert message in response.json()["detail"]
    assert "private" not in response.text


def test_health_checks_connectivity(monkeypatch):
    verify = Mock()
    monkeypatch.setattr(api.db, "driver", Mock(return_value=Mock(verify_connectivity=verify)))
    response = request("GET", "/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    verify.assert_called_once()


def test_rate_limit_returns_429_after_retries(monkeypatch):
    attempt = Future(3)
    attempt.set_exception(RateLimitError("private provider response"))
    monkeypatch.setattr(api, "ask", Mock(side_effect=RetryError(attempt)))
    response = request("POST", "/ask", json={"question": "Who owns Salesforce?"})
    assert response.status_code == 429
    assert response.headers["retry-after"] == "60"
    assert "private" not in response.text


@pytest.mark.parametrize("error, status", [
    (llm.ConfigurationError("GOOGLE_API_KEY is required"), 503),
    (LLMGenerationError("private provider response"), 502),
])
def test_llm_errors_have_actionable_status(monkeypatch, error, status):
    monkeypatch.setattr(api, "ask", Mock(side_effect=error))
    response = request("POST", "/ask", json={"question": "Who owns Salesforce?"})
    assert response.status_code == status
    assert "private" not in response.text


def test_blank_questions_and_document_keys_are_rejected_before_execution(monkeypatch):
    ask = Mock()
    generate = Mock()
    monkeypatch.setattr(api, "ask", ask)
    monkeypatch.setattr(api.docgen, "generate", generate)
    assert request("POST", "/ask", json={"question": "   "}).status_code == 422
    assert request("POST", "/documents", json={
        "type": "impact", "label": "System", "key": "   ",
    }).status_code == 422
    ask.assert_not_called()
    generate.assert_not_called()


def test_search_punctuation_does_not_query_database(monkeypatch):
    read = Mock()
    monkeypatch.setattr(api.db, "read", read)
    response = request("GET", "/graph/search", params={"q": "!!"})
    assert response.status_code == 200
    assert response.json() == []
    read.assert_not_called()


def test_source_document_is_retrieved_with_acl_groups(monkeypatch):
    document = Mock(return_value="Example charter\n\nStored excerpt")
    monkeypatch.setattr(api.context, "document", document)
    response = request("GET", "/api/sources/document", params={"id": "example/charter"})
    assert response.status_code == 200
    assert "Stored excerpt" in response.text
    document.assert_called_once_with("example/charter", api.config.DEFAULT_GROUPS)
    document.side_effect = LookupError("Document not found")
    assert request("GET", "/api/sources/document", params={"id": "missing"}).status_code == 404
