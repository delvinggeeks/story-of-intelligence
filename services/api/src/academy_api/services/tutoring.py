"""Routes a tutoring request to a provider and assembles the context it may see.

The router is the only place that touches content and learner evidence. Providers get a
finished `TutorContext` and nothing else, so adding a provider can never widen what the
tutoring layer reads.

Observability is a single structured log line per request, emitted locally. It records the
task, concept, provider, and which rules fired. It deliberately does **not** record the
learner's question or draft: that text exists for the length of the request and is never
written to a log, a database, or a third party.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Sequence

from academy_api.core.exceptions import (
    ContentNotFoundError,
    DatabaseUnavailableError,
    UnknownProviderError,
    UnsupportedTaskError,
)
from academy_api.domain.progress import ConceptProgress
from academy_api.domain.tutoring import (
    ProviderCapability,
    TutorCapabilities,
    TutorContext,
    TutorRequest,
    TutorResponse,
    TutorTask,
)
from academy_api.providers.base import TutorProvider
from academy_api.repositories.content import ContentRepository
from academy_api.services.progress import ProgressService

logger = logging.getLogger(__name__)


class TutoringService:
    def __init__(
        self,
        content: ContentRepository,
        providers: Sequence[TutorProvider],
        default_provider_id: str,
        progress: ProgressService | None = None,
    ) -> None:
        self._content = content
        self._providers = {provider.info.id: provider for provider in providers}
        self._default_provider_id = default_provider_id
        self._progress = progress

    def capabilities(self) -> TutorCapabilities:
        return TutorCapabilities(
            defaultProviderId=self._default_provider_id,
            providers=[
                ProviderCapability(
                    info=provider.info,
                    tasks=[task for task in TutorTask if provider.supports(task)],
                )
                for provider in self._providers.values()
            ],
        )

    async def respond(self, request: TutorRequest) -> TutorResponse:
        provider = self._resolve(request.provider_id)
        if not provider.supports(request.task):
            raise UnsupportedTaskError(
                f"Provider '{provider.info.id}' does not support the '{request.task}' task."
            )

        lesson = self._content.get_learning_object(request.concept_id)
        context = TutorContext(
            learningObject=lesson,
            progress=await self._learner_progress(request),
        )

        started = time.perf_counter()
        response = provider.respond(request, context)
        elapsed_ms = (time.perf_counter() - started) * 1000

        # No learner text: the question and the draft never leave the request.
        logger.info(
            "TUTOR task=%s concept=%s provider=%s supported=%s evidence=%s rules=%s ms=%.1f",
            response.task,
            response.concept_id,
            response.provider.id,
            response.supported,
            response.trace.evidence_used,
            ",".join(response.trace.rules_fired),
            elapsed_ms,
        )
        return response

    def _resolve(self, provider_id: str | None) -> TutorProvider:
        wanted = provider_id or self._default_provider_id
        provider = self._providers.get(wanted)
        if provider is None:
            known = ", ".join(sorted(self._providers)) or "none"
            raise UnknownProviderError(
                f"Unknown tutoring provider '{wanted}'. Registered: {known}."
            )
        return provider

    async def _learner_progress(self, request: TutorRequest) -> ConceptProgress | None:
        """Evidence sharpens an answer but is never required to produce one."""
        if request.learner_id is None or self._progress is None:
            return None
        try:
            return await self._progress.for_concept(request.learner_id, request.concept_id)
        except (ContentNotFoundError, DatabaseUnavailableError):
            # An unknown learner or an unreachable database costs personalisation, not help.
            return None
