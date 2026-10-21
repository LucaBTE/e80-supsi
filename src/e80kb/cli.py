"""Command line: e80kb init | ingest | ask | doc | serve."""

import argparse
import json
import logging
from pathlib import Path

from . import aliases, config, db, docgen, schema


def main() -> None:
    parser = argparse.ArgumentParser(prog="e80kb")
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("init", help="create constraints and indexes")

    ingest = commands.add_parser("ingest", help="load a data folder into the graph")
    ingest.add_argument("root", type=Path, help="data root, e.g. data/ (document ids are paths relative to it)")
    ingest.add_argument("--workers", type=int, default=4)
    ingest.add_argument("--no-llm", action="store_true", help="only paths, chunks and spreadsheet rows")
    ingest.add_argument("--force", action="store_true", help="also process files whose hash is unchanged")
    ingest.add_argument("--prune", action="store_true",
                        help="delete documents whose file is no longer under root (always pass the same root)")

    ask = commands.add_parser("ask", help="ask a question")
    ask.add_argument("question")

    doc = commands.add_parser("doc", help="generate a document about one entity")
    doc.add_argument("type", choices=sorted(docgen.DOC_TYPES))
    doc.add_argument("label", choices=schema.DOMAIN_LABELS)
    doc.add_argument("key")
    doc.add_argument("--language", default="Italian", choices=["Italian", "English"])

    serve = commands.add_parser("serve", help="run the HTTP API")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)

    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    for noisy in ("httpx", "google_genai"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    if args.command == "init":
        db.init_schema()
        aliases.load()
    elif args.command == "ingest":
        from .ingest.pipeline import ingest as run_ingest

        db.init_schema()
        aliases.load()
        print(dict(run_ingest(args.root, args.workers, not args.no_llm, args.prune, args.force)))
    elif args.command == "ask":
        from .retrieval.ask import ask as run_ask

        answer = run_ask(args.question, config.DEFAULT_GROUPS)
        print(answer["answer"])
        print(f"\nCypher:\n{answer['cypher'] or '(none)'}")
        if answer["cypher_error"]:
            print(f"Cypher error: {answer['cypher_error']}")
        cited = [s for s in answer["sources"] if s["cited"]]
        print("\nSources:" if cited else "\nSources: none cited")
        for s in cited:
            print(f"[{s['n']}] {s['path']} - {s['loc']}")
    elif args.command == "doc":
        result = docgen.generate(args.type, args.label, args.key, config.DEFAULT_GROUPS, args.language)
        print(result["markdown"])
        print("\n" + json.dumps([{k: s[k] for k in ("n", "path", "loc")} for s in result["sources"]], ensure_ascii=False))
    elif args.command == "serve":
        import uvicorn

        uvicorn.run("e80kb.api:app", host=args.host, port=args.port)


if __name__ == "__main__":
    main()
