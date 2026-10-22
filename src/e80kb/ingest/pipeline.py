"""Ingest a folder: unchanged files are skipped, changed files replace their old version."""

import asyncio
import hashlib
import logging
from collections import Counter
from pathlib import Path

from .. import db
from ..catalog import Catalog
from . import extract, load
from .classify import classify
from .parse import PARSERS, parse

log = logging.getLogger(__name__)


def ingest(root: Path, workers: int = 4, use_llm: bool = True, prune: bool = False, force: bool = False) -> Counter:
    """Load every supported file under `root`. Returns a count per outcome."""
    if not root.is_dir():
        raise ValueError(f"data root is not a directory: {root}")
    if workers < 1:
        raise ValueError("workers must be at least 1")
    return asyncio.run(_ingest(root, workers, use_llm, prune, force))


async def _ingest(root: Path, workers: int, use_llm: bool, prune: bool, force: bool) -> Counter:
    stats = Counter()
    files = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name.startswith((".", "~$")):
            continue
        if path.suffix.lower() in PARSERS:
            files.append(path)
        else:
            log.info("skip %s: unsupported format", path.relative_to(root))
            stats["unsupported"] += 1

    slots, write_lock = asyncio.Semaphore(workers), asyncio.Lock()

    async def one(path: Path) -> str:
        async with slots:
            return await _ingest_file(root, path, use_llm, force, write_lock)

    stats.update(await asyncio.gather(*(one(p) for p in files)))
    if use_llm:
        await extract.resolve_duplicates()

    if prune:
        seen = {p.relative_to(root).as_posix() for p in files}
        stored = {row["path"] for row in db.read("MATCH (d:Document) WHERE d.path IS NOT NULL RETURN d.path AS path")}
        gone = sorted(stored - seen)
        for path in gone:
            load.forget(path)
        stats["removed"] = len(gone)
    return stats


async def _ingest_file(root: Path, path: Path, use_llm: bool, force: bool, write_lock: asyncio.Lock) -> str:
    rel = path.relative_to(root).as_posix()
    try:
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        if not force and load.stored_hash(rel) == sha:
            return "unchanged"
        meta = classify(rel)
        chunks = parse(path)
        graph = await extract.build(meta, chunks, Catalog.load(), use_llm)
        async with write_lock:
            load.forget(rel)
            await extract.write(graph)
            load.link_document(meta)
            load.write_records(meta, extract.chunk_ids(rel, chunks), chunks)
        if not use_llm:
            # No hash stored: a later run with the LLM still extracts this file.
            log.info("loaded %s (%d chunks, no extraction)", rel, len(chunks))
            return "loaded"
        load.mark_done(rel, sha)
        log.info("ingested %s (%d chunks)", rel, len(chunks))
        return "ingested"
    except Exception:
        log.exception("failed %s", rel)
        return "failed"
