from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from backend import main
from backend.models import Extraction
from backend.seed import SAMPLE_DESCRIPTION, SAMPLE_RULES


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATABASE", tmp_path / "test.sqlite3")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(main.app) as client:
        yield client


def profile(client, participant_id=1):
    return next(item for item in client.get("/api/bootstrap").json()["participants"] if item["id"] == participant_id)


def sample_draft(client):
    response = client.post("/api/extract", json={"description": SAMPLE_DESCRIPTION, "demo": True})
    assert response.status_code == 200
    return response.json()


def study_input(draft, **changes):
    payload = dict(draft_id=draft["draft_id"], title="New visual search study", description=SAMPLE_DESCRIPTION,
                   topic="cognition", mode="online", location="Online", duration=30, compensation=12,
                   rules=draft["rules"], manual_review=False, approved=True,
                   slots=[dict(starts_at=(datetime.now(timezone.utc) + timedelta(days=10)).isoformat(), capacity=1)])
    payload.update(changes)
    return payload


def get_matches(client, participant_id=1):
    response = client.get(f"/api/participants/{participant_id}/matches")
    assert response.status_code == 200
    return response.json()


def test_unknown_is_screening_known_failure_is_excluded(client):
    alex = {study["id"]: study for study in get_matches(client)["matches"]}
    assert alex[1]["status"] == "needs_screening"
    assert alex[1]["questions"] == [{"id": "previous_visual_search", "question": SAMPLE_RULES[3]["question"]}]
    assert alex[1]["score"] is None
    assert 5 not in alex
    jamie = {study["id"]: study for study in get_matches(client, 3)["matches"]}
    assert {question["id"] for question in jamie[1]["questions"]} == {"english", "previous_visual_search"}
    failed = client.post("/api/participants/3/answers", json={"study_id": 1, "answers": {"english": False}})
    assert failed.json()["status"] == "ineligible"
    assert 1 not in {study["id"] for study in get_matches(client, 3)["matches"]}


def test_sample_extraction_requires_exact_example_and_explicit_approval(client):
    assert client.post("/api/extract", json={"description": "An unrelated description", "demo": True}).status_code == 422
    assert client.post("/api/extract", json={"description": SAMPLE_DESCRIPTION, "demo": False}).status_code == 503
    draft = sample_draft(client)
    assert draft["mode"] == "sample"
    assert client.post("/api/studies", json=study_input(draft, approved=False)).status_code == 422
    assert client.post("/api/studies", json=study_input(draft, description=SAMPLE_DESCRIPTION + " Modified.")).status_code == 422
    published = client.post("/api/studies", json=study_input(draft))
    assert published.status_code == 201
    assert published.json()["slots"][0]["remaining"] == 1
    assert client.post("/api/studies", json=study_input(draft)).status_code == 409


def test_complete_screening_unlocks_booking_and_updates_researcher(client):
    studies = client.get("/api/researcher/studies").json()["studies"]
    study = next(study for study in studies if study["id"] == 1)
    payload = {"participant_id": 1, "slot_id": study["slots"][0]["id"]}
    assert client.post("/api/bookings", json=payload).status_code == 409
    assert client.post("/api/participants/1/answers", json={"study_id": 1, "answers": {"previous_visual_search": False}}).json() == {"status": "eligible"}
    assert client.post("/api/bookings", json=payload).status_code == 201
    assert client.post("/api/bookings", json=payload).status_code == 409
    matches = get_matches(client)
    assert next(study for study in matches["matches"] if study["id"] == 1)["booked"]
    assert len(matches["bookings"]) == 1
    assert all(notice["study_id"] != 1 for notice in matches["notifications"])
    dashboard = client.get("/api/researcher/studies").json()
    assert next(study for study in dashboard["studies"] if study["id"] == 1)["booked_count"] == 1
    assert dashboard["bookings"][0]["participant_name"] == "Alex Morgan"


def test_last_seat_is_atomic_and_overlapping_booking_rejected(client):
    draft = sample_draft(client)
    payload = study_input(draft, rules=[])
    study = client.post("/api/studies", json=payload).json()
    slot_id = study["slots"][0]["id"]
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda identifier: client.post("/api/bookings", json={"participant_id": identifier, "slot_id": slot_id}), [1, 2]))
    assert sorted(response.status_code for response in results) == [201, 409]
    winner = [1, 2][next(index for index, response in enumerate(results) if response.status_code == 201)]
    overlapping = client.post("/api/studies", json=study_input(sample_draft(client), rules=[], slots=payload["slots"])).json()
    response = client.post("/api/bookings", json={"participant_id": winner, "slot_id": overlapping["slots"][0]["id"]})
    assert response.status_code == 409
    assert "overlaps" in response.json()["detail"]


def test_manual_review_is_blocked_and_rules_not_exposed(client):
    matches = get_matches(client)["matches"]
    assert all("rules" not in study for study in matches)
    manual = next(study for study in matches if study["id"] == 6)
    assert manual["status"] == "manual_review"
    assert manual["questions"] == []
    assert manual["slots"] == []
    researcher = client.get("/api/researcher/studies").json()["studies"]
    slot_id = next(study for study in researcher if study["id"] == 6)["slots"][0]["id"]
    assert client.post("/api/bookings", json={"participant_id": 1, "slot_id": slot_id}).status_code == 409


def test_profile_preferences_rerank_without_changing_eligibility(client):
    before = get_matches(client)
    assert before["matches"][0]["id"] == 2
    updated = profile(client)
    updated.update(interests=["language"], weights={"interest": 10, "compensation": 0, "convenience": 0}, notifications=False)
    updated.pop("id")
    assert client.put("/api/participants/1", json=updated).status_code == 200
    after = get_matches(client)
    assert after["matches"][0]["id"] == 3
    assert after["notifications"] == []
    assert {study["id"]: study["status"] for study in before["matches"]} == {study["id"]: study["status"] for study in after["matches"]}
    updated["weights"] = {"interest": 0, "compensation": 0, "convenience": 0}
    assert client.put("/api/participants/1", json=updated).status_code == 422


def test_create_profile_and_reject_nonboolean_answer(client):
    new_profile = profile(client)
    new_profile.pop("id")
    new_profile.update(name="Fictional tester", english=None)
    created = client.post("/api/participants", json=new_profile)
    assert created.status_code == 200
    identifier = created.json()["id"]
    assert identifier not in (1, 2, 3)
    invalid = client.post(f"/api/participants/{identifier}/answers", json={"study_id": 1, "answers": {"english": "yes"}})
    assert invalid.status_code == 422
    answered = client.post(f"/api/participants/{identifier}/answers", json={"study_id": 1, "answers": {"english": True, "previous_visual_search": False}})
    assert answered.json()["status"] == "eligible"
    assert profile(client, identifier)["english"] is True


def test_safety_requirement_survives_researcher_publish(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-not-a-real-key")
    extraction = Extraction(rules=[SAMPLE_RULES[0]], manual_review=False, review_notes=[])
    monkeypatch.setattr(main, "OpenAI", lambda **kwargs: SimpleNamespace(responses=SimpleNamespace(parse=lambda **kwargs: SimpleNamespace(output_parsed=extraction))))
    description = "Recruit participants aged 18–35 for an MRI study."
    response = client.post("/api/extract", json={"description": description, "demo": False})
    assert response.status_code == 200
    draft = response.json()
    assert draft["manual_review"]
    published = client.post("/api/studies", json=study_input(draft, description=description, manual_review=False))
    assert published.status_code == 201
    assert published.json()["manual_review"]
    participant_view = next(study for study in get_matches(client)["matches"] if study["id"] == published.json()["id"])
    assert "aged 18" not in participant_view["description"]
    assert "MRI" not in participant_view["description"]
    assert participant_view["questions"] == []
    assert client.post("/api/bookings", json={"participant_id": 1, "slot_id": published.json()["slots"][0]["id"]}).status_code == 409


def test_expired_session_and_unknown_records_are_rejected(client):
    with main.database() as connection:
        connection.execute("UPDATE slots SET starts_at = ? WHERE id = 3", ((datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),))
    assert client.post("/api/bookings", json={"participant_id": 1, "slot_id": 3}).status_code == 409
    assert client.post("/api/bookings", json={"participant_id": 1, "slot_id": 999}).status_code == 404
    assert client.get("/api/participants/999/matches").status_code == 404
