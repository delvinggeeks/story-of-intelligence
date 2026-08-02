import pytest
from fastapi.testclient import TestClient

from academy_api.domain.learning_object import STEP_KIND_LABELS, StepKind


def test_graph_exposes_only_the_numbers_production_scope(client: TestClient) -> None:
    response = client.get("/api/v1/graph")
    assert response.status_code == 200

    payload = response.json()
    assert [node["id"] for node in payload["nodes"]] == ["numbers"]
    assert payload["nodes"][0]["prerequisites"] == []


def test_numbers_learning_object_satisfies_the_los_v2_contract(client: TestClient) -> None:
    response = client.get("/api/v1/learning-objects/numbers")
    assert response.status_code == 200

    payload = response.json()
    assert payload["id"] == "numbers"
    assert payload["version"] == "2.0.0"
    assert payload["stability"] == "timeless"
    assert {step["kind"] for step in payload["learning"]["steps"]} >= {
        "observe",
        "experiment",
        "fail",
        "discover",
    }
    assert payload["measurement"]["masteryRubric"]["threshold"] >= 3
    assert len(payload["measurement"]["masteryRubric"]["checks"]) >= 5


def test_experiment_steps_reference_declared_experiments(client: TestClient) -> None:
    payload = client.get("/api/v1/learning-objects/numbers").json()
    declared = {experiment["id"] for experiment in payload["learning"]["experiments"]}
    referenced = {
        step["experimentId"]
        for step in payload["learning"]["steps"]
        if step["kind"] == "experiment"
    }
    assert referenced
    assert referenced <= declared


def test_every_step_carries_a_backend_owned_display_label(client: TestClient) -> None:
    payload = client.get("/api/v1/learning-objects/numbers").json()
    steps = payload["learning"]["steps"]

    assert all(step["label"] for step in steps)
    labels = {step["kind"]: step["label"] for step in steps}
    assert labels["fail"] == "Break It"
    assert labels["experiment"] == "Experiment"


def test_labels_are_defined_for_the_whole_step_taxonomy() -> None:
    assert set(STEP_KIND_LABELS) == set(StepKind)


@pytest.mark.parametrize(
    "concept_id",
    ["linear-regression", "unknown", "../../prototype/content/knowledge-graph.v1", "Numbers"],
)
def test_unresolvable_concepts_are_rejected(client: TestClient, concept_id: str) -> None:
    response = client.get(f"/api/v1/learning-objects/{concept_id}")
    assert response.status_code == 404
