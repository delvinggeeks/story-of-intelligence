"""Canonical content access.

The API owns content resolution; the learner surface never reads files.
Phase C may replace the file-backed implementation with a database-backed one
without changing the ``ContentRepository`` contract.
"""

import json
import re
from pathlib import Path
from typing import Protocol

from pydantic import BaseModel, ValidationError

from academy_api.core.exceptions import ContentIntegrityError, ContentNotFoundError
from academy_api.domain.knowledge_graph import KnowledgeGraph
from academy_api.domain.learning_object import LearningObject

CONCEPT_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class ContentRepository(Protocol):
    def get_graph(self) -> KnowledgeGraph: ...

    def get_learning_object(self, concept_id: str) -> LearningObject: ...


class FileContentRepository:
    """Reads canonical JSON artifacts from a content root directory."""

    def __init__(self, content_root: Path) -> None:
        self._root = content_root.resolve()
        self._objects_dir = self._root / "learning-objects"

    def get_graph(self) -> KnowledgeGraph:
        payload = self._read_json(self._root / "knowledge-graph.json")
        return self._validate(KnowledgeGraph, payload, "knowledge-graph.json")

    def get_learning_object(self, concept_id: str) -> LearningObject:
        if not CONCEPT_ID_PATTERN.fullmatch(concept_id):
            raise ContentNotFoundError(f"Unknown concept '{concept_id}'.")

        node = self.get_graph().node(concept_id)
        if node is None:
            raise ContentNotFoundError(f"Unknown concept '{concept_id}'.")

        # Resolve through the graph so only graph-referenced files are readable.
        path = (self._objects_dir / node.learning_object).resolve()
        if path.parent != self._objects_dir:
            raise ContentIntegrityError(f"Learning object path escapes content root: {path}")

        payload = self._read_json(path)
        return self._validate(LearningObject, payload, node.learning_object)

    def _read_json(self, path: Path) -> object:
        try:
            raw = path.read_text(encoding="utf-8")
        except FileNotFoundError as exc:
            raise ContentNotFoundError(f"Missing canonical artifact: {path.name}") from exc
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ContentIntegrityError(f"Invalid JSON in {path.name}: {exc}") from exc

    @staticmethod
    def _validate[T: BaseModel](model: type[T], payload: object, name: str) -> T:
        try:
            return model.model_validate(payload)
        except ValidationError as exc:
            raise ContentIntegrityError(f"{name} violates its contract: {exc}") from exc
