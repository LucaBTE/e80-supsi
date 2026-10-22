"""Canonical names and aliases of shared entities, written by `e80kb init` and `e80kb ingest`.

Extraction reuses these keys, so the same system never becomes two nodes.
Add a line here when a new alias shows up in the documents.
"""

from . import db, schema

# label -> canonical key -> aliases
ALIASES = {
    "System": {
        "SAP": ["ERP", "ERP-System"],
        "Salesforce": ["SFDC", "CRM"],
        "ProcessUnity": ["Process Unity", "Supplier qualification - SW"],
        "SDI": ["Sistema di Interscambio", "Interchange system/SDI"],
        "Configuratore Excel": ["Configurator", "tool Ghinelli"],
    },
}


def load() -> None:
    for label, entries in ALIASES.items():
        # label comes from this file and is checked against the schema
        if label not in schema.DOMAIN_LABELS:
            raise ValueError(f"unknown label {label!r} in ALIASES")
        db.write(
            f"""
            UNWIND $rows AS row
            MERGE (n:{label} {{{schema.key_of(label)}: row.key}})
            SET n:__Entity__, n.aliases = row.aliases
            """,
            rows=[{"key": key, "aliases": aliases} for key, aliases in entries.items()],
        )
