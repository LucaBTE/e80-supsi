"""Mistral through neo4j-graphrag's LLM interface, shared by every pipeline step."""

import os
from functools import cache

from neo4j_graphrag.llm import MistralAILLM

from . import config


class ConfigurationError(ValueError):
    """The LLM cannot be used with the current local settings."""


@cache
def client() -> MistralAILLM:
    api_key = os.environ.get("MISTRAL_API_KEY", "").strip()
    if not api_key:
        raise ConfigurationError("MISTRAL_API_KEY is required; set it in .env or the environment")
    return MistralAILLM(model_name=config.MODEL, api_key=api_key)


def text(system: str, content: str) -> str:
    return client().invoke(content, system_instruction=system).content
