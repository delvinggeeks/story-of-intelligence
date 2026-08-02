"""The HTTP surface of the learner loop.

These exercise the real app against a real database, because the contract that matters is
what a browser receives, not what a service returns internally.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.database

CONCEPT = "numbers"
GOOD_ANSWER = (
    "The quantity is a count of records, the unit is millions versus thousands, and comparing "
    "them needs one unit. Getting it wrong risks a bad decision."
)


def bootstrap(client: TestClient) -> tuple[str, str]:
    learner = client.post("/api/v1/learners")
    assert learner.status_code == 201
    learner_id = learner.json()["id"]

    session = client.post(f"/api/v1/learners/{learner_id}/sessions", json={"conceptId": CONCEPT})
    assert session.status_code == 200
    return learner_id, session.json()["id"]


def append(client: TestClient, session_id: str, event: dict[str, object]):  # type: ignore[no-untyped-def]
    return client.post(f"/api/v1/sessions/{session_id}/events", json={"event": event})


def test_a_bootstrapped_learner_carries_no_personal_data(client: TestClient) -> None:
    body = client.post("/api/v1/learners").json()

    assert set(body) == {"id", "created_at", "last_seen_at"}
    assert uuid.UUID(body["id"]).version == 4


def test_an_unknown_learner_is_not_found(client: TestClient) -> None:
    assert client.get(f"/api/v1/learners/{uuid.uuid4()}").status_code == 404


def test_a_session_is_resumed_rather_than_duplicated(client: TestClient) -> None:
    learner_id, session_id = bootstrap(client)

    again = client.post(f"/api/v1/learners/{learner_id}/sessions", json={"conceptId": CONCEPT})

    # A page reload must not fragment one sitting into many sessions.
    assert again.json()["id"] == session_id


def test_evidence_of_an_unknown_kind_is_rejected(client: TestClient) -> None:
    _, session_id = bootstrap(client)

    response = append(client, session_id, {"kind": "lesson.vibed"})

    assert response.status_code == 422


def test_evidence_with_a_malformed_payload_is_rejected(client: TestClient) -> None:
    _, session_id = bootstrap(client)

    response = append(client, session_id, {"kind": "step.viewed", "stepIndex": -1})

    assert response.status_code == 422


def test_the_full_learner_journey_produces_progress(client: TestClient) -> None:
    learner_id, session_id = bootstrap(client)

    assert (
        append(
            client, session_id, {"kind": "lesson.started", "conceptVersion": "2.0.0"}
        ).status_code
        == 201
    )
    assert append(client, session_id, {"kind": "step.viewed", "stepIndex": 0}).status_code == 201
    assert (
        append(
            client,
            session_id,
            {
                "kind": "experiment.performed",
                "experimentId": "numbers-unit-compare",
                "normalized": True,
            },
        ).status_code
        == 201
    )
    assert (
        append(
            client,
            session_id,
            {"kind": "reflection.submitted", "phase": "post", "response": GOOD_ANSWER},
        ).status_code
        == 201
    )
    assert (
        append(
            client, session_id, {"kind": "lesson.completed", "conceptVersion": "2.0.0"}
        ).status_code
        == 201
    )

    progress = client.get(f"/api/v1/learners/{learner_id}/progress/{CONCEPT}").json()

    assert progress["stepsViewed"] == [0]
    assert progress["experimentsPerformed"] == ["numbers-unit-compare"]
    assert progress["completionRecorded"] is True
    assert progress["mastery"]["mastered"] is True
    assert progress["eventsUnreadable"] == 0


def test_progress_survives_a_new_session(client: TestClient) -> None:
    """Reloading the page must not lose what the learner already did."""
    learner_id, session_id = bootstrap(client)
    append(client, session_id, {"kind": "step.viewed", "stepIndex": 3})

    client.post(f"/api/v1/learners/{learner_id}/sessions", json={"conceptId": CONCEPT})
    progress = client.get(f"/api/v1/learners/{learner_id}/progress/{CONCEPT}").json()

    assert progress["stepsViewed"] == [3]


def test_a_retraction_updates_progress_without_deleting_anything(client: TestClient) -> None:
    learner_id, session_id = bootstrap(client)
    reflection = append(
        client,
        session_id,
        {"kind": "reflection.submitted", "phase": "post", "response": GOOD_ANSWER},
    ).json()

    assert (
        append(
            client,
            session_id,
            {
                "kind": "evidence.retracted",
                "retractsEventId": reflection["id"],
                "reason": "answered in the wrong box",
            },
        ).status_code
        == 201
    )

    progress = client.get(f"/api/v1/learners/{learner_id}/progress/{CONCEPT}").json()
    assert progress["postReflection"] is None
    assert progress["mastery"] is None

    # The retracted event is still on the record; nothing was removed.
    events = client.get(f"/api/v1/sessions/{session_id}/events").json()
    assert reflection["id"] in [event["id"] for event in events]


def test_a_learner_cannot_retract_another_learners_evidence(client: TestClient) -> None:
    _, victim_session = bootstrap(client)
    victim_event = append(client, victim_session, {"kind": "step.viewed", "stepIndex": 1}).json()
    _, attacker_session = bootstrap(client)

    response = append(
        client,
        attacker_session,
        {
            "kind": "evidence.retracted",
            "retractsEventId": victim_event["id"],
            "reason": "not mine to retract",
        },
    )

    assert response.status_code == 422


def test_evidence_is_returned_in_replay_order(client: TestClient) -> None:
    _, session_id = bootstrap(client)
    for index in range(6):
        append(client, session_id, {"kind": "step.viewed", "stepIndex": index})

    events = client.get(f"/api/v1/sessions/{session_id}/events").json()
    sequences = [event["sequence"] for event in events]

    assert sequences == sorted(sequences)


def test_progress_for_an_unknown_concept_is_not_found(client: TestClient) -> None:
    learner_id, _ = bootstrap(client)

    assert client.get(f"/api/v1/learners/{learner_id}/progress/quantum-alchemy").status_code == 404


def test_the_erasure_route_is_absent_when_no_token_is_configured(client: TestClient) -> None:
    """Unconfigured means the endpoint does not exist, so there is nothing to probe."""
    learner_id, _ = bootstrap(client)

    assert client.delete(f"/internal/learners/{learner_id}").status_code == 404


def test_the_vocabulary_is_published_for_clients(client: TestClient) -> None:
    body = client.get("/api/v1/evidence-vocabulary").json()

    assert body["version"] == "1.0.0"
    assert "reflection.submitted" in body["kinds"]
