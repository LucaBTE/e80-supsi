"""Metadata from a file path alone: source, project, phase, process, type, ACL.

Path layout of the test data:
    Projects/<project>/<NN. phase>/...  (SharePoint)
    Processes/<area>/<code>/...         (Signavio)
"""

import re
from dataclasses import dataclass
from pathlib import PurePosixPath

SOURCES = {"Projects": "sharepoint", "Processes": "signavio"}

# First match on the lowercase file name wins.
DOC_TYPES = (
    ("requirements matrix", "ReqMatrix"),
    ("testbook", "Testbook"),
    ("test book", "Testbook"),
    ("charter", "Charter"),
    ("business blueprint", "BBP"),
    ("recap", "Recap"),
    ("manual", "Manual"),
    ("proposal", "Proposal"),
    ("proposta", "Proposal"),
)

# PTP.01.01, PTP.03, LTC_04_01_v8
PROCESS_CODE = re.compile(r"\b([A-Z]{3})[._ ]?(\d{2})(?:[._](\d{2}))?(?:[._](v\d+))?\b")
PHASE = re.compile(r"^\d{2}\. ")


@dataclass(frozen=True)
class DocMeta:
    path: str  # relative to the data root, POSIX separators
    title: str
    format: str
    source: str
    type: str
    acl: str
    project: str | None = None
    phase: str | None = None
    process: str | None = None
    process_name: str | None = None


def classify(path: str) -> DocMeta:
    p = PurePosixPath(path)
    parts = p.parts
    project = phase = process = process_name = None
    doc_type = next((t for word, t in DOC_TYPES if word in p.stem.lower()), "Document")

    if parts[0] == "Projects" and len(parts) > 2:
        project = parts[1]
        if len(parts) > 3 and PHASE.match(parts[2]):
            phase = parts[2]
    elif parts[0] == "Processes":
        doc_type = "ProcessMap"
        process, process_name = _process(p)

    return DocMeta(
        path=path,
        title=p.stem,
        format=p.suffix.lower().lstrip("."),
        source=SOURCES.get(parts[0], "filesystem"),
        type=doc_type,
        # Folders named "IT Internal ..." are for the IT department only.
        acl="IT" if any("IT Internal" in part for part in parts) else "Internal",
        project=project,
        phase=phase,
        process=process,
        process_name=process_name,
    )


def _process(p: PurePosixPath) -> tuple[str | None, str | None]:
    """Process code and name of a process map.

    'PTP.04.07 - Put-away Coordination (EL80).pdf' -> variant 'PTP.04.07 (EL80)'.
    A file without its own code is a subprocess of its folder:
    'PTP.01.01/Internal review.pdf' -> 'PTP.01.01 > Internal review'.
    """
    if m := PROCESS_CODE.search(p.stem):
        name = p.stem[m.end():].lstrip(" -_") or None
        code = _code(m)
        if name and (variant := re.fullmatch(r".+ \((.+)\)", name)):
            code = f"{code} ({variant.group(1)})"
        return code, name
    for folder in reversed(p.parts[:-1]):
        if m := PROCESS_CODE.fullmatch(folder):
            return f"{_code(m)} > {p.stem}", p.stem
    return None, None


def _code(m: re.Match) -> str:
    return ".".join(part for part in m.groups() if part)


def process_lineage(code: str) -> list[tuple[str, str, str]]:
    """(child, relationship, parent) links from a process code up to its root."""
    links = []
    while True:
        if " > " in code:
            parent, rel = code.rsplit(" > ", 1)[0], "PART_OF"
        elif m := re.fullmatch(r"(.+) \(.+\)", code):
            parent, rel = m.group(1), "VARIANT_OF"
        elif m := re.fullmatch(r"(.+)\.v\d+", code):
            parent, rel = m.group(1), "VARIANT_OF"
        elif "." in code:
            parent, rel = code.rsplit(".", 1)[0], "PART_OF"
        else:
            return links
        links.append((code, rel, parent))
        code = parent
