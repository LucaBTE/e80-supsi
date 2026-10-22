"""Known domain entities: a prompt catalog for the LLM and a key resolver."""

import re
from dataclasses import dataclass

from . import db, schema


@dataclass(frozen=True)
class Entry:
    label: str
    key: str
    name: str | None
    aliases: tuple[str, ...]


class Catalog:
    def __init__(self, entries: list[Entry], project_codes: dict[str, str] | None = None):
        self.entries = entries
        self.project_codes = project_codes or {}  # project name -> code, e.g. '173'
        self._index: dict[tuple[str, str], str] = {}
        for e in entries:
            for variant in (e.key, e.name):
                if variant:
                    self._index.setdefault((e.label, _norm(variant)), e.key)
        # Curated aliases win over keys: a duplicate node named 'CRM' must not shadow Salesforce.
        for e in entries:
            for alias in e.aliases:
                self._index[(e.label, _norm(alias))] = e.key

    @classmethod
    def load(cls) -> "Catalog":
        rows = db.read(
            """
            MATCH (n:__Entity__)
            WITH n, [l IN labels(n) WHERE l IN $labels][0] AS label WHERE label IS NOT NULL
            RETURN label, properties(n) AS props
            """,
            labels=list(schema.DOMAIN_LABELS),
        )
        entries, codes = [], {}
        for row in rows:
            label, props = row["label"], row["props"]
            key = props.get(schema.key_of(label))
            if key is None:
                continue
            name = props.get(schema.NAME_PROPS.get(label, ""))
            entries.append(Entry(label, str(key), name, tuple(props.get("aliases") or ())))
            if label == "Project" and props.get("code"):
                codes[key] = props["code"]
        entries.sort(key=lambda e: (schema.DOMAIN_LABELS.index(e.label), e.key))
        return cls(entries, codes)

    def subset(self, keep) -> "Catalog":
        """The entries for which `keep(entry)` is true; prompts stay short and on topic."""
        return Catalog([e for e in self.entries if keep(e)], self.project_codes)

    def resolve(self, label: str, key: str) -> str:
        """Canonical key for `key`: matches keys, names and aliases, ignoring case and word order."""
        key = key.strip()
        if found := self._index.get((label, _norm(key))):
            return found
        # Over-qualified ids: 'Rinnovi Offerte H24/173/RQ-001' -> '173/RQ-001'
        matches = {e.key for e in self.entries if e.label == label and "/" in e.key and key.endswith("/" + e.key)}
        return matches.pop() if len(matches) == 1 else key

    def text(self) -> str:
        lines, current = [], None
        for e in self.entries:
            if e.label != current:
                current = e.label
                lines.append(f"{e.label}:")
            extra = []
            if e.name and e.name not in e.key:
                extra.append(e.name)
            if e.aliases:
                extra.append("aliases: " + ", ".join(e.aliases))
            lines.append(f"- {e.key}" + (f" ({'; '.join(extra)})" if extra else ""))
        return "\n".join(lines) or "(empty)"


def _norm(text: str) -> str:
    return " ".join(sorted(re.findall(r"\w+", text.lower())))
