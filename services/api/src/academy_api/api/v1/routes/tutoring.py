"""Tutoring routes: one ask, one capabilities listing.

Deliberately stateless. There is no conversation id, no history endpoint, and no write
path, because ADR-0007's evidence vocabulary defines no kind for asking for help and this
phase does not invent one.
"""

from fastapi import APIRouter

from academy_api.api.dependencies import TutoringServiceDep
from academy_api.domain.tutoring import TutorCapabilities, TutorRequest, TutorResponse

router = APIRouter(prefix="/tutor", tags=["tutoring"])


@router.get(
    "/capabilities",
    summary="List the registered tutoring providers and the tasks each supports",
    description=(
        "Provider metadata states whether a provider is deterministic and whether it is "
        "external. Phase E registers one local deterministic provider and no external one."
    ),
)
def capabilities(tutoring: TutoringServiceDep) -> TutorCapabilities:
    return tutoring.capabilities()


@router.post(
    "",
    summary="Ask for help with one Learning Object",
    description=(
        "Answers only from the published Learning Object. Returns `supported: false` when "
        "the question falls outside it. Nothing in the request body is stored: no evidence "
        "is written, no conversation is kept, and the learner's text is never logged."
    ),
    responses={
        404: {"description": "Unknown concept"},
        422: {"description": "Unknown provider or a task the provider does not support"},
    },
)
async def ask(body: TutorRequest, tutoring: TutoringServiceDep) -> TutorResponse:
    return await tutoring.respond(body)
