from typing import Dict, Any
try:
    from ..verification import extract_score, extract_sources, score_source
except ImportError:
    from verification import extract_score, extract_sources, score_source

# Compatibility in-memory store reference
jobs_store: Dict[str, Any] = {}

__all__ = ["jobs_store", "extract_score", "extract_sources", "score_source"]
