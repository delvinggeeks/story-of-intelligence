"""Derives the current progress view by replaying evidence.

The projection is never stored. It is recomputed from the append-only stream on every
request, which is what keeps it honest: there is no second source of truth to drift, and a
retraction takes effect immediately without any repair job.
"""

import uuid

from academy_api.domain.progress import ConceptProgress, project_progress
from academy_api.repositories.content import ContentRepository
from academy_api.services.learning_record import LearningRecordService


class ProgressService:
    def __init__(self, records: LearningRecordService, content: ContentRepository) -> None:
        self._records = records
        self._content = content

    async def for_concept(self, learner_id: uuid.UUID, concept_id: str) -> ConceptProgress:
        """Raises ContentNotFoundError when the learner or the concept does not exist."""
        await self._records.get_learner(learner_id)
        learning_object = self._content.get_learning_object(concept_id)
        events = await self._records.list_evidence_for_concept(learner_id, concept_id)
        return project_progress(learner_id, learning_object, events)
