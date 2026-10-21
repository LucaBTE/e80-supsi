from e80kb.catalog import Catalog, Entry

CATALOG = Catalog([
    Entry("System", "Salesforce", None, ("SFDC", "CRM")),
    Entry("Person", "Luca Mondini", None, ("Mondini Luca",)),
    Entry("Requirement", "173/RQ-001", "Automatic Contract Renewal Scheduling", ()),
    Entry("Requirement", "132/RQ-001", "Quotations with integrated price lists", ()),
])


def test_aliases_case_and_word_order():
    assert CATALOG.resolve("System", "sfdc") == "Salesforce"
    assert CATALOG.resolve("Person", "Mondini Luca") == "Luca Mondini"
    assert CATALOG.resolve("Person", "mondini  luca ") == "Luca Mondini"


def test_over_qualified_id():
    assert CATALOG.resolve("Requirement", "Rinnovi Offerte H24/173/RQ-001") == "173/RQ-001"


def test_ambiguous_or_unknown_stays():
    assert CATALOG.resolve("Requirement", "RQ-001") == "RQ-001"  # 173 or 132: no guess
    assert CATALOG.resolve("System", " Coupa ") == "Coupa"
