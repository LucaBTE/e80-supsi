import pytest

from e80kb.retrieval.guard import GuardError, check

ALLOWED = [
    "MATCH (s:System {name: 'Salesforce'})<-[c:CHANGES]-(p:Project) RETURN s, c, p",
    "MATCH (b:BusinessObject)<-[u:CREATES|READS|UPDATES]-(a:Activity) RETURN b, u, a LIMIT 10",
    "MATCH (n:Project) WHERE n.name IN ['Create', 'Set'] RETURN n",
    "MATCH p = (a:Process)-[*1..2]-(b) RETURN [x IN nodes(p) | x.name] AS names, labels(a)[0] AS label",
    "MATCH (i:Issue) RETURN i.description, collect(i.id)[..3] AS ids",
    "MATCH (t:TestCase) RETURN CASE WHEN t.result = 'OK' THEN [t] ELSE [] END AS ok",
]

FORBIDDEN = [
    "MATCH (n) DETACH DELETE n",
    "MATCH (n:Project) SET n.name = 'x'",
    "CALL db.index.fulltext.queryNodes('chunk_text', 'x') YIELD node RETURN node",
    "MATCH (c:Chunk) RETURN c",
    "MATCH (n)-[:FROM_CHUNK]->(m) RETURN m",
    "MATCH (n:__KGBuilder__) RETURN n",
    "MATCH (n) RETURN n.text",
    "MATCH (n) RETURN properties(n)",
    "MATCH (n) RETURN n {.*}",
    "MATCH (n) RETURN n['te' + 'xt']",
    "LOAD CSV FROM 'file:///etc/passwd' AS row RETURN row",
    "",
]


@pytest.mark.parametrize("query", ALLOWED)
def test_allowed(query):
    check(query)


@pytest.mark.parametrize("query", FORBIDDEN)
def test_forbidden(query):
    with pytest.raises(GuardError):
        check(query)
