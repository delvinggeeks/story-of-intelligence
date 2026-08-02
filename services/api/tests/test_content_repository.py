import pytest

from academy_api.core.config import Settings
from academy_api.core.exceptions import ContentNotFoundError
from academy_api.repositories.content import FileContentRepository


@pytest.fixture
def repository(settings: Settings) -> FileContentRepository:
    return FileContentRepository(settings.content_root)


def test_graph_nodes_reference_resolvable_learning_objects(
    repository: FileContentRepository,
) -> None:
    for node in repository.get_graph().nodes:
        assert repository.get_learning_object(node.id).id == node.id


def test_prerequisites_resolve_within_the_graph(repository: FileContentRepository) -> None:
    graph = repository.get_graph()
    known = {node.id for node in graph.nodes}
    for node in graph.nodes:
        assert set(node.prerequisites) <= known


@pytest.mark.parametrize(
    "concept_id",
    ["../knowledge-graph", "numbers/../numbers", "numbers.v2", "", "NUMBERS"],
)
def test_concept_ids_outside_the_graph_are_refused(
    repository: FileContentRepository, concept_id: str
) -> None:
    with pytest.raises(ContentNotFoundError):
        repository.get_learning_object(concept_id)
