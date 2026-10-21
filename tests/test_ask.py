from e80kb.retrieval.ask import _cited


def test_cited_numbers():
    assert _cited("A [1]. B [2, 4]. C [6-8].") == {1, 2, 4, 6, 7, 8}


def test_no_citations():
    assert _cited("Le informazioni fornite non contengono dati.") == set()
    assert _cited("see list[0] in code") == {0}  # harmless: there is no source 0
