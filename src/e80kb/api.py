"""HTTP API for the web interface.

No login yet: every request reads with config.DEFAULT_GROUPS.
"""

import re
from typing import Literal

from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from neo4j.exceptions import AuthError, ServiceUnavailable, SessionExpired
from neo4j_graphrag.exceptions import LLMGenerationError, RateLimitError
from pydantic import BaseModel, ConfigDict, Field
from tenacity import RetryError

from . import browse, config, db, docgen, llm, schema
from .retrieval.ask import ask
from .retrieval import context

app = FastAPI(title="E80 Knowledge API")
router = APIRouter()

DomainLabel = Literal[schema.DOMAIN_LABELS]


class RequestModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class AskRequest(RequestModel):
    question: str = Field(min_length=3, max_length=2000)


class DocRequest(RequestModel):
    type: Literal[tuple(docgen.DOC_TYPES)]
    label: DomainLabel
    key: str = Field(min_length=1, max_length=300)
    language: Literal["Italian", "English"] = "English"


@app.get("/", include_in_schema=False)
def home():
    index = config.FRONTEND_DIST / "index.html"
    if index.is_file():
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
    return RedirectResponse("/docs")


@app.get("/favicon.ico", include_in_schema=False, status_code=204)
def favicon() -> Response:
    return Response(status_code=204)


@app.exception_handler(AuthError)
async def database_auth_error(request, exc) -> JSONResponse:
    return JSONResponse(status_code=503, content={
        "detail": "Neo4j authentication failed. Check NEO4J_USER and NEO4J_PASSWORD in .env.",
    })


@app.exception_handler(ServiceUnavailable)
@app.exception_handler(SessionExpired)
async def database_unavailable(request, exc) -> JSONResponse:
    return JSONResponse(status_code=503, content={
        "detail": "Neo4j is unavailable. Check that it is running and NEO4J_URI is correct.",
    })


@app.exception_handler(llm.ConfigurationError)
async def llm_configuration_error(request, exc) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(RetryError)
@app.exception_handler(RateLimitError)
@app.exception_handler(LLMGenerationError)
async def llm_error(request, exc) -> JSONResponse:
    if isinstance(exc, RetryError):
        exc = exc.last_attempt.exception()
    if isinstance(exc, RateLimitError):
        return JSONResponse(status_code=429, headers={"Retry-After": "60"}, content={
            "detail": "Gemini rate limit reached. Wait before retrying and check your API quota.",
        })
    return JSONResponse(status_code=502, content={
        "detail": "Gemini could not generate a response. Check the API key, model and service availability.",
    })


@router.get("/health")
def health() -> dict:
    db.driver().verify_connectivity()
    return {"status": "ok"}


@router.post("/ask")
def ask_endpoint(request: AskRequest) -> dict:
    return ask(request.question, config.DEFAULT_GROUPS)


@router.get("/graph/catalog")
def catalog(limit: int = Query(1000, ge=1, le=2000)) -> dict:
    return browse.catalog(config.DEFAULT_GROUPS, limit)


@router.get("/graph/search")
def search(q: str = Query(min_length=2, max_length=200), limit: int = Query(20, ge=1, le=100)) -> list[dict]:
    """Entities whose name, code or id matches the words of `q` (prefix match)."""
    terms = " ".join(f"{word}*" for word in re.findall(r"\w+", q.lower())[:10])
    if not terms:
        return []
    rows = db.read(
        """
        CALL db.index.fulltext.queryNodes('entity_names', $terms, {limit: $limit})
        YIELD node AS n, score
        RETURN [l IN labels(n) WHERE l IN $labels][0] AS label, properties(n) AS props, score
        """,
        terms=terms, limit=limit, labels=list(schema.DOMAIN_LABELS),
    )
    return [
        {
            "label": row["label"],
            "key": row["props"].get(schema.key_of(row["label"])),
            "name": row["props"].get(schema.NAME_PROPS.get(row["label"], "name")),
            "score": row["score"],
        }
        for row in rows
    ]


@router.get("/graph/node")
def node(label: DomainLabel, key: str = Query(min_length=1, max_length=300)) -> dict:
    """One entity with its direct neighbours in the domain graph."""
    result = db.read_graph(
        f"""
        MATCH (n:{label} {{{schema.key_of(label)}: $key}})
        OPTIONAL MATCH (n)-[r]-(m) WHERE NOT (m:Chunk OR m:Document OR m:Source)
        RETURN n, r, m
        """,
        {"key": key},
    )
    if not result.rows:
        raise HTTPException(404, f"{label} {key!r} not found")
    return result.graph()


@router.post("/documents")
def generate_doc(request: DocRequest) -> dict:
    try:
        return docgen.generate(request.type, request.label, request.key, config.DEFAULT_GROUPS, request.language)
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.get("/sources/document", response_class=PlainTextResponse)
def source_document(id: str = Query(min_length=1, max_length=2000)) -> PlainTextResponse:
    try:
        return PlainTextResponse(context.document(id, config.DEFAULT_GROUPS))
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc


# Keep the original API URLs for existing clients. The browser uses /api so
# frontend assets and backend endpoints share one origin in both run modes.
app.include_router(router, prefix="/api")
app.include_router(router, include_in_schema=False)
if (config.FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=config.FRONTEND_DIST / "assets"), name="assets")
