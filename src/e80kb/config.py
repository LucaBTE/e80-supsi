"""Settings read from environment variables, or from a .env file in the working directory.

Variables already set in the environment win over the .env file. The Google
SDK reads GOOGLE_API_KEY from the environment, so it can live in .env too.
"""

import os

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
# Empty password = connect without auth (local test instances only).
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "")

# Gemini model for every LLM step. Flash-Lite is the cheapest tier.
MODEL = os.environ.get("E80KB_MODEL", "gemini-3.1-flash-lite")

# There is no login yet: every caller reads with these ACL groups.
DEFAULT_GROUPS = [g.strip() for g in os.environ.get("E80KB_GROUPS", "Internal").split(",") if g.strip()]
