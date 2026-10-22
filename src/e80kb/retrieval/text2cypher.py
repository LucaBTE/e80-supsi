"""Natural language -> Cypher over the domain graph, with one retry on error."""

import logging

from neo4j.exceptions import ClientError
from neo4j_graphrag.retrievers.text2cypher import extract_cypher

from .. import db, llm, schema
from . import guard

log = logging.getLogger(__name__)

ATTEMPTS = 2
NO_QUERY = "NONE"


SYSTEM = f"""You translate questions from E80's IT department into one read-only Cypher query for Neo4j.
Questions may be in Italian or English.

{schema.describe()}

Rules:
- Use only the labels, relationship types and properties above. Documents and chunks are not queryable.
- Match entities by the exact keys in the catalog. Activities are not listed: match them by name.
- When no key fits (a partial name, a surname), match with toLower(n.name) CONTAINS 'word'.
- Return nodes and relationships, not only their properties, so the user can see the subgraph. Give columns clear aliases.
- Use OPTIONAL MATCH for parts that may be missing, so one missing link does not empty the result.
- Read only: no CREATE, MERGE, SET, DELETE, CALL or LOAD CSV. No dynamic property access.
- Reply with the query only. Reply NONE when the graph cannot answer the question.

Examples:

Question: If we change the Quote, which activities, roles, processes and projects are affected?
MATCH (b:BusinessObject {{name: 'Quote'}})<-[u:CREATES|READS|UPDATES]-(a:Activity)
OPTIONAL MATCH (a)-[d:DONE_BY]->(r:Role)
OPTIONAL MATCH (p:Process)-[h:HAS_STEP]->(a)
OPTIONAL MATCH (prj:Project)-[c:CHANGES]->(p)
RETURN b, u, a, d, r, h, p, c, prj

Question: Chi devo coinvolgere per una modifica a Salesforce?
MATCH (s:System {{name: 'Salesforce'}})<-[c:CHANGES]-(p:Project)<-[w:WORKS_ON]-(x:Person)
RETURN s, c, p, w, x

Question: Which test verifies requirement 173/RQ-002 and what was the result?
MATCH (t:TestCase)-[v:VERIFIES]->(q:Requirement {{id: '173/RQ-002'}})
RETURN t, v, q

Question: Quali sistemi usa la qualifica fornitori?
MATCH (p:Process {{code: 'PTP.01.01'}})-[h:HAS_STEP]->(a:Activity)-[u:USES]->(s:System)
RETURN p, h, a, u, s"""


def run(question: str, catalog: str) -> tuple[str, db.GraphResult, str | None]:
    """Generate and run a query. Returns (cypher, result, last error)."""
    cypher, error = "", None
    for _ in range(ATTEMPTS):
        content = f"<catalog>\n{catalog}\n</catalog>\n\nQuestion: {question}"
        if error:
            content += f"\n\nYour previous query failed.\nQuery:\n{cypher}\nError: {error}\nWrite a corrected query."
        cypher = extract_cypher(llm.text(SYSTEM, content)).strip()
        if not cypher or cypher.upper() == NO_QUERY:
            return "", db.GraphResult(), None
        try:
            guard.check(cypher)
            return cypher, db.read_graph(cypher), None
        except (guard.GuardError, ClientError) as e:
            error = str(e)
            log.info("cypher rejected: %s", error)
    return cypher, db.GraphResult(), error
