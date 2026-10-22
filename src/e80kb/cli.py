"""Command line: e80kb init | seed | ingest | ask | doc | serve."""

import argparse
import json
import logging
import sys
from pathlib import Path

from neo4j.exceptions import AuthError, ServiceUnavailable, SessionExpired
from neo4j_graphrag.exceptions import LLMGenerationError, RateLimitError
from tenacity import RetryError

from . import aliases, config, db, docgen, llm, schema


def _run() -> None:
    parser = argparse.ArgumentParser(prog="e80kb")
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("init", help="create constraints and indexes")
    seed = commands.add_parser("seed", help="load sample documents and domain graph into Neo4j (no ingestion)")
    seed.add_argument("--file", type=Path, default=Path(__file__).resolve().parents[2] / "seed.cypher")

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
    doc.add_argument("--language", default="English", choices=["Italian", "English"])

    serve = commands.add_parser("serve", help="run the HTTP API")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)

    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    for noisy in ("httpx", "google_genai"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    if args.command == "seed":
        from .seed import load_seed

        if not args.file.is_file():
            parser.error(f"seed file not found: {args.file}")
        print(json.dumps(load_seed(args.file), ensure_ascii=False))
    elif args.command == "init":
        db.init_schema()
        aliases.load()
    elif args.command == "ingest":
        from .ingest.pipeline import ingest as run_ingest

        if not args.root.is_dir():
            parser.error(f"data root is not a directory: {args.root}")
        if args.workers < 1:
            parser.error("--workers must be at least 1")
        db.init_schema()
        aliases.load()
        stats = run_ingest(args.root, args.workers, not args.no_llm, args.prune, args.force)
        print(dict(stats))
        if stats.get("failed", 0):
            raise SystemExit(1)
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

        db.driver().verify_connectivity()
        uvicorn.run("e80kb.api:app", host=args.host, port=args.port)


def main() -> None:
    try:
        _run()
    except AuthError:
        print("Neo4j authentication failed. Set NEO4J_USER and NEO4J_PASSWORD in .env. For the sample database, run docker compose up -d --wait and use the credentials from .env.example.", file=sys.stderr)
        raise SystemExit(1) from None
    except (ServiceUnavailable, SessionExpired):
        print("Neo4j is unavailable. Check NEO4J_URI and the database service, then run docker compose up -d --wait for the sample database.", file=sys.stderr)
        raise SystemExit(1) from None
    except llm.ConfigurationError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from None
    except (RetryError, RateLimitError, LLMGenerationError) as exc:
        cause = exc.last_attempt.exception() if isinstance(exc, RetryError) else exc
        message = ("Gemini rate limit reached. Wait before retrying and check the API quota."
                   if isinstance(cause, RateLimitError) else
                   "Gemini could not generate a response. Check GOOGLE_API_KEY and E80KB_MODEL.")
        print(message, file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
