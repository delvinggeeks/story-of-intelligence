"""What every tutoring provider must be, and nothing about who any of them are.

A provider is a pure function with metadata: given a request and the context the router
assembled, return a response. It receives no repository, no session, and no settings, so a
future provider cannot quietly reach past the router for data the learner did not consent
to share.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from academy_api.domain.tutoring import (
    ProviderInfo,
    TutorContext,
    TutorRequest,
    TutorResponse,
    TutorTask,
)


@runtime_checkable
class TutorProvider(Protocol):
    @property
    def info(self) -> ProviderInfo: ...

    def supports(self, task: TutorTask) -> bool: ...

    def respond(self, request: TutorRequest, context: TutorContext) -> TutorResponse: ...
