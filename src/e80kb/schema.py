"""Graph schema: single source of truth for labels, keys and relationships.

Used to create constraints, to bound LLM extraction and to describe the graph
to the text-to-Cypher model.
"""

from neo4j_graphrag.components.schema import GraphSchema, NodeType, PropertyType, RelationshipType

# label -> (key property, description)
NODES = {
    "Project": ("name", "IT project, e.g. 'Rinnovi Offerte H24'. Properties: code, status."),
    "Process": ("code", "business process, variant or subprocess, e.g. 'PTP.01.01', 'LTC.04.01.v8', "
                        "'PTP.05.02 (Invoice without a PO)', 'PTP.01.01 > Internal review'. Property: name."),
    "Activity": ("id", "step of a process, key '<process code>#<activity name>'. Properties: name, seq, kind."),
    "Role": ("name", "role or process lane, e.g. 'Buyer', 'Service Owner'."),
    "Person": ("name", "person, key 'First Last'. Properties: title, aliases."),
    "OrgUnit": ("name", "E80 department, e.g. 'Procurement', 'IT'."),
    "Company": ("code", "E80 group company, e.g. 'EL80'. Property: name."),
    "Organization": ("name", "external company or partner, e.g. 'Accenture'."),
    "System": ("name", "software system, e.g. 'SAP', 'Salesforce'. Property: aliases."),
    "BusinessObject": ("name", "business data object, e.g. 'Invoice', 'Purchase Order', 'Quote'."),
    "Requirement": ("id", "project requirement, key '<project code>/<requirement id>', e.g. '173/RQ-002'; "
                          "the project name replaces the code only when the project has no code. "
                          "Properties: title, priority, status."),
    "TestCase": ("id", "test case, key '<project code>/<test id>', e.g. '173/TST-003'; "
                       "the project name replaces the code only when the project has no code. "
                       "Properties: title, result, date."),
    "Issue": ("id", "known problem or pain point, key = short title. Property: description."),
    "Source": ("name", "system the documents come from: sharepoint, signavio, devops."),
    "Document": ("id", "source file. Properties: path, title, type, format, phase, acl, sha256."),
    "Chunk": ("id", "piece of a document, key '<document id>#<index>'. Properties: text, loc, index."),
}

SOURCE_LABELS = ("Source", "Document", "Chunk")
DOMAIN_LABELS = tuple(label for label in NODES if label not in SOURCE_LABELS)

# Property that holds a readable name when the key is a code or an id.
NAME_PROPS = {
    "Process": "name",
    "Activity": "name",
    "Company": "name",
    "Requirement": "title",
    "TestCase": "title",
    "Issue": "description",
}

# Domain relationships: (type, from label, to label).
RELATIONS = (
    ("PART_OF", "Process", "Process"),
    ("VARIANT_OF", "Process", "Process"),
    ("RUNS_AT", "Process", "Company"),
    ("HAS_STEP", "Process", "Activity"),
    ("NEXT", "Activity", "Activity"),
    ("CALLS", "Activity", "Process"),
    ("DONE_BY", "Activity", "Role"),
    ("USES", "Activity", "System"),
    ("CREATES", "Activity", "BusinessObject"),
    ("READS", "Activity", "BusinessObject"),
    ("UPDATES", "Activity", "BusinessObject"),
    ("IN", "Role", "OrgUnit"),
    ("MEMBER_OF", "Person", "OrgUnit"),
    ("MEMBER_OF", "Person", "Organization"),
    ("MASTERS", "System", "BusinessObject"),
    ("CHANGES", "Project", "Process"),
    ("CHANGES", "Project", "System"),
    ("DEPENDS_ON", "Project", "Project"),
    ("WORKS_ON", "Person", "Project"),
    ("WORKS_ON", "Organization", "Project"),
    ("HAS_REQ", "Project", "Requirement"),
    ("HAS_TEST", "Project", "TestCase"),
    ("REQUESTED", "Person", "Requirement"),
    ("IMPACTS", "Requirement", "BusinessObject"),
    ("IMPACTS", "Requirement", "System"),
    ("IMPACTS", "Requirement", "Process"),
    ("VERIFIES", "TestCase", "Requirement"),
    ("TESTS", "TestCase", "Activity"),
    ("EXECUTED", "Person", "TestCase"),
    ("AFFECTS", "Issue", "Process"),
    ("AFFECTS", "Issue", "System"),
)
RELATION_SET = frozenset(RELATIONS)
RELATION_TYPES = tuple(sorted({rel_type for rel_type, _, _ in RELATIONS}))

# Spreadsheet record prefix -> (label, relationship from the project).
RECORD_KINDS = {"RQ": ("Requirement", "HAS_REQ"), "TST": ("TestCase", "HAS_TEST"), "TC": ("TestCase", "HAS_TEST")}

# Written by the loader only. The lexical graph follows neo4j-graphrag:
# (Chunk)-[:FROM_DOCUMENT]->(Document), (Chunk)-[:NEXT_CHUNK]->(Chunk), (entity)-[:FROM_CHUNK]->(Chunk).
SOURCE_RELATIONS = ("FROM", "ABOUT", "NEW_REV_OF", "FROM_DOCUMENT", "NEXT_CHUNK", "FROM_CHUNK")

# Every domain node carries this label: neo4j-graphrag resolves duplicates among them.
ENTITY_LABEL = "__Entity__"
INTERNAL_LABELS = (ENTITY_LABEL, "__KGBuilder__")

# Properties accepted by extraction in addition to each node's key and name.
NODE_PROPS = {
    "Project": {"code": "STRING", "status": "STRING"},
    "Activity": {"seq": "INTEGER", "kind": "STRING"},
    "Person": {"title": "STRING", "aliases": "LIST"},
    "System": {"aliases": "LIST"},
    "Requirement": {"priority": "STRING", "status": "STRING"},
    "TestCase": {"result": "STRING", "date": "STRING"},
}

REL_PROPS = {
    "WORKS_ON": ("role", "PM, sponsor, stakeholder, team, tester or partner"),
    "USES": ("transaction", "SAP transaction code, e.g. 'MIRO'"),
}


def key_of(label: str) -> str:
    return NODES[label][0]


def describe() -> str:
    """The domain layer as text for LLM prompts."""
    nodes = "\n".join(f"- {label} (key: {key_of(label)}): {NODES[label][1]}" for label in DOMAIN_LABELS)
    rels = "\n".join(f"- ({a})-[:{t}]->({b})" for t, a, b in RELATIONS)
    return f"""Node labels:
{nodes}

Relationships:
{rels}

Relationship properties:
""" + "\n".join(f"- {t}.{prop}: {desc}" for t, (prop, desc) in REL_PROPS.items())


def graph_schema() -> GraphSchema:
    """The domain layer for neo4j-graphrag extraction: nothing outside it is kept."""
    def node(label: str) -> NodeType:
        key, description = NODES[label]
        props = [PropertyType(name=key, type="STRING", description=f"key: {description}")]
        if (name := NAME_PROPS.get(label)) and name != key:
            props.append(PropertyType(name=name, type="STRING", description="readable name"))
        props.extend(PropertyType(name=name, type=kind) for name, kind in NODE_PROPS.get(label, {}).items())
        return NodeType(label=label, description=description, properties=props, additional_properties=False)

    def rel(rel_type: str) -> RelationshipType:
        props = []
        if rel_type in REL_PROPS:
            prop, description = REL_PROPS[rel_type]
            props.append(PropertyType(name=prop, type="STRING", description=description))
        # Without declared properties the library lets the LLM add its own; say so explicitly.
        return RelationshipType(label=rel_type, properties=props, additional_properties=not props)

    return GraphSchema(
        node_types=tuple(node(label) for label in DOMAIN_LABELS),
        relationship_types=tuple(rel(t) for t in RELATION_TYPES),
        patterns=tuple((source, rel_type, target) for rel_type, source, target in RELATIONS),
        additional_node_types=False,
        additional_relationship_types=False,
        additional_patterns=False,
    )
