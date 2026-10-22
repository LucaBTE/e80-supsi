from unittest.mock import Mock

from e80kb.retrieval import document_impact


def test_document_change_orders_review_candidates_and_keeps_acl_groups(monkeypatch):
    source = {"id": "rev3", "title": "Blueprint", "path": "Projects/Blueprint_Rev3.docx"}
    revision = {"id": "rev2", "title": "Blueprint", "path": "Projects/Blueprint_Rev2.docx"}
    charter = {"id": "charter", "title": "Charter", "path": "Projects/Charter.pdf"}

    def read(query, **params):
        assert params["groups"] == ["Internal"]
        if "ORDER BY d.id" in query:
            return [source, revision, charter]
        if "NEW_REV_OF" in query:
            return [revision]
        if "coalesce(entity.name" in query:
            return []
        if "coalesce(subject.name" in query:
            return [{**charter, "shared": "Example project"}]
        return []

    mocked = Mock(side_effect=read)
    monkeypatch.setattr(document_impact.db, "read", mocked)
    result = document_impact.answer_if_applicable(
        "If I change document Blueprint_Rev3.docx, which other documents should I review?", ["Internal"],
    )

    assert result["root_document_id"] == "rev3"
    assert [edge["end"] for edge in result["graph"]["relationships"]] == ["rev2", "charter"]
    assert result["graph"]["relationships"][0]["properties"]["reason"] == "explicit document revision"
    assert "review candidates" in result["answer"]
    assert "contents must change" in result["answer"]


def test_unmatched_question_uses_regular_answer_pipeline(monkeypatch):
    read = Mock(return_value=[])
    monkeypatch.setattr(document_impact.db, "read", read)
    assert document_impact.answer_if_applicable("What changed in Salesforce?", ["Internal"]) is None
    read.assert_not_called()
