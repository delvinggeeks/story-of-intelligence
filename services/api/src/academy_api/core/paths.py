"""Filesystem anchors for the API service.

Resolution never depends on the process working directory alone, and never on
``__file__`` alone, so the service behaves identically whether it is launched
from the repository root, from ``services/api`` via ``uv run --directory``, or
from a non-editable installation where ``__file__`` points into site-packages.
"""

from collections.abc import Iterable, Sequence
from pathlib import Path

CONTENT_SUBPATH = Path("packages") / "content"
CONTENT_MARKER = "knowledge-graph.json"

_PACKAGE_ANCHOR = Path(__file__).resolve().parent


def _walk_up(starts: Iterable[Path]) -> Iterable[Path]:
    seen: set[Path] = set()
    for start in starts:
        for candidate in (start, *start.parents):
            if candidate not in seen:
                seen.add(candidate)
                yield candidate


def _candidate_starts(extra: Sequence[Path]) -> list[Path]:
    return [*(path.resolve() for path in extra), Path.cwd().resolve(), _PACKAGE_ANCHOR]


def find_repository_root(extra_starts: Sequence[Path] = ()) -> Path | None:
    """Nearest ancestor holding ``packages/content/knowledge-graph.json``."""
    for candidate in _walk_up(_candidate_starts(extra_starts)):
        if (candidate / CONTENT_SUBPATH / CONTENT_MARKER).is_file():
            return candidate
    return None


def find_service_root(extra_starts: Sequence[Path] = ()) -> Path | None:
    """Nearest ancestor holding the API service ``pyproject.toml``."""
    for candidate in _walk_up(_candidate_starts(extra_starts)):
        if (candidate / "pyproject.toml").is_file() and (
            candidate / "src" / "academy_api"
        ).is_dir():
            return candidate
    return None
