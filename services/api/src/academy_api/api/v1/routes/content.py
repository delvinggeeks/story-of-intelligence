from fastapi import APIRouter

from academy_api.api.dependencies import ContentRepositoryDep
from academy_api.domain.knowledge_graph import KnowledgeGraph
from academy_api.domain.learning_object import LearningObject

router = APIRouter(tags=["content"])


@router.get("/graph", summary="Resolve the canonical Knowledge Graph")
def get_graph(repository: ContentRepositoryDep) -> KnowledgeGraph:
    return repository.get_graph()


@router.get(
    "/learning-objects/{concept_id}",
    summary="Resolve one canonical Learning Object",
    responses={404: {"description": "Concept is not present in the Knowledge Graph"}},
)
def get_learning_object(concept_id: str, repository: ContentRepositoryDep) -> LearningObject:
    return repository.get_learning_object(concept_id)
