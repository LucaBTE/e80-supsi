"""Gemini through neo4j-graphrag's LLM interface, shared by every pipeline step."""

from functools import cache

from neo4j_graphrag.llm import GeminiLLM

from . import config


@cache
def client() -> GeminiLLM:
    # Reads GOOGLE_API_KEY (or GEMINI_API_KEY) from the environment; retries rate limits.
    return GeminiLLM(model_name=config.MODEL)


def text(system: str, content: str) -> str:
    return client().invoke(content, system_instruction=system).content
