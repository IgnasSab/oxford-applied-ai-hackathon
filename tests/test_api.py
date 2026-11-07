from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from io import BytesIO

import pytest
from fastapi.testclient import TestClient

from backend import main


PASSWORD = "StudyMatch2026!"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATABASE", tmp_path / "test.sqlite3")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(main.app) as client:
        yield client


@pytest.fixture
def researcher(client):
    with TestClient(main.app) as researcher:
        login(researcher, "researcher@studymatch.demo")
        yield researcher


@pytest.fixture
def participant(client):
    with TestClient(main.app) as participant:
        login(participant, "participant@studymatch.demo")
        yield participant


def login(client, email):
    response = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()


def signup(client, email="new@example.test", role="participant"):
    response = client.post("/api/auth/signup", json={
        "name": "Fictional tester", "email": email, "password": PASSWORD, "role": role,
    })
    assert response.status_code in (200, 201), response.text
    return response


def profile_input(**changes):
    profile = dict(
        name="Fictional tester", age=24, handedness="right", first_language="English",
        english=True, vision=True, psychology_background=False, university="Oxford",
        free_response="I enjoy visual puzzles.", interests=["Puzzles & Memory Games"],
        preferred_mode="any", preferred_location="", max_duration=480,
        preferred_times=[], notifications="off",
        weights=dict(interest=3, compensation=3, convenience=3),
    )
    profile.update(changes)
    return profile


def study_input(**changes):
    study = dict(
        draft_id=None, title="Visual puzzle session", summary="Try a set of visual puzzles.",
        description="Complete a short series of visual puzzles in your browser.",
        requirements="No eligibility restrictions", mode="online", location="Online",
        duration=30, compensation=10, tags=["Puzzles & Memory Games"],
        convenience_score=5, convenience_reason="One short session from home.",
        rules=[], manual_review=False, review_notes=[], approved=True,
        slots=[dict(starts_at=(datetime.now(timezone.utc) + timedelta(days=10)).isoformat(), capacity=1)],
    )
    study.update(changes)
    return study


def publish(researcher, **changes):
    response = researcher.post("/api/studies", json=study_input(**changes))
    assert response.status_code in (200, 201), response.text
    return response.json()


def get_matches(participant):
    response = participant.get("/api/matches")
    assert response.status_code == 200, response.text
    return response.json()


def match_for(participant, study):
    return next(item for item in get_matches(participant)["matches"] if item["id"] == study["id"])


def rule(identifier, answer_type="boolean", operator="equals", value="false", **changes):
    result = dict(id=identifier, field="question", answer_type=answer_type, operator=operator,
                  value=value, choices=[], question="Have you taken part in this study before?",
                  source="Participants must not have taken part in this study before.")
    result.update(changes)
    return result


def sample_draft(researcher):
    source = researcher.get("/api/bootstrap").json()["sample_description"]
    response = researcher.post("/api/extract", json={"description": source, "demo": True})
    assert response.status_code == 200, response.text
    return response.json()


def draft_payload(draft, **changes):
    payload = study_input(**draft["fields"], draft_id=draft["draft_id"], rules=draft["rules"],
                          manual_review=draft["manual_review"], review_notes=draft["review_notes"])
    payload.update(changes)
    return payload


def test_signup_onboarding_login_logout_persist_and_protect_session(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/matches").status_code == 401
    response = signup(client, "  Fresh@Example.test  ")
    account = response.json()
    assert account["email"] == "fresh@example.test"
    assert account["role"] == "participant"
    assert account["onboarded"] is False
    assert "password" not in account
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=" in cookie
    assert client.get("/api/profile").json() is None
    assert client.get("/api/matches").status_code in (403, 409)
    profile = profile_input()
    assert client.put("/api/profile", json=profile).status_code == 200
    assert client.get("/api/auth/me").json()["onboarded"] is True
    session_cookies = dict(client.cookies)
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401
    with TestClient(main.app) as stale:
        stale.cookies.update(session_cookies)
        assert stale.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/login", json={"email": account["email"], "password": "wrong-password"}).status_code == 401
    login(client, account["email"])
    assert client.get("/api/profile").json()["free_response"] == profile["free_response"]
    duplicate = client.post("/api/auth/signup", json={"name": "Duplicate", "email": "FRESH@EXAMPLE.TEST", "password": PASSWORD, "role": "researcher"})
    assert duplicate.status_code == 409
    assert client.get("/api/auth/me").json()["role"] == "participant"


def test_roles_and_profiles_are_isolated(client, researcher, participant):
    assert participant.get("/api/researcher/studies").status_code == 403
    assert participant.post("/api/studies", json=study_input()).status_code == 403
    assert researcher.get("/api/profile").status_code == 403
    assert researcher.get("/api/matches").status_code == 403
    original = participant.get("/api/profile").json()
    signup(client)
    assert client.get("/api/profile").json() is None
    assert client.put("/api/profile", json=profile_input(age=33)).status_code == 200
    assert participant.get("/api/profile").json() == original
    assert "participants" not in client.get("/api/bootstrap").json()


def test_researcher_studies_and_drafts_have_owners(client, researcher):
    private_study = publish(researcher)
    draft = sample_draft(researcher)
    signup(client, "other-researcher@example.test", "researcher")
    assert client.get("/api/researcher/studies").json() == {"studies": [], "bookings": []}
    assert client.post("/api/studies", json=draft_payload(draft)).status_code in (403, 404)
    own = publish(client, title="Owned by second researcher")
    assert {item["id"] for item in client.get("/api/researcher/studies").json()["studies"]} == {own["id"]}
    first_ids = {item["id"] for item in researcher.get("/api/researcher/studies").json()["studies"]}
    assert private_study["id"] in first_ids and own["id"] not in first_ids


def test_sample_extraction_approval_and_single_publish(researcher):
    assert researcher.post("/api/extract", json={"description": "Unrelated document text.", "demo": True}).status_code == 422
    source = researcher.get("/api/bootstrap").json()["sample_description"]
    assert researcher.post("/api/extract", json={"description": source, "demo": False}).status_code == 503
    draft = sample_draft(researcher)
    assert draft["mode"] == "sample"
    assert draft["source_text"] == source
    assert researcher.post("/api/studies", json=draft_payload(draft, approved=False)).status_code == 422
    payload = draft_payload(draft, title="Researcher-reviewed title")
    response = researcher.post("/api/studies", json=payload)
    assert response.status_code in (200, 201), response.text
    assert response.json()["title"] == payload["title"]
    assert researcher.post("/api/studies", json=payload).status_code == 409


def test_known_failure_excluded_and_unknown_questions_reveal_no_expected_answers(researcher, participant):
    excluded = publish(researcher, rules=[rule("age", "number", "between", "70,90", field="age", question="How old are you?", source="Participants aged 70–90.")])
    potential = publish(researcher, requirements="Participants must not have taken part in this study before.", rules=[rule("previous")])
    matches = get_matches(participant)["matches"]
    assert excluded["id"] not in {item["id"] for item in matches}
    match = next(item for item in matches if item["id"] == potential["id"])
    assert match["status"] == "needs_screening"
    assert match["slots"] == []
    assert 1 <= match["score"] <= 5
    assert match["questions"] == [{"id": "previous", "question": rule("previous")["question"], "answer_type": "boolean", "choices": []}]
    assert all(not {"rules", "requirements", "review_notes"}.intersection(item) for item in matches)
    assert participant.post("/api/bookings", json={"slot_id": potential["slots"][0]["id"]}).status_code == 409
    assert participant.post("/api/answers", json={"study_id": potential["id"], "answers": {"previous": "false"}}).status_code == 422
    assert participant.post("/api/answers", json={"study_id": potential["id"], "answers": {"unknown": False}}).status_code == 422
    assert participant.post("/api/answers", json={"study_id": potential["id"], "answers": {"previous": False}}).json() == {"status": "eligible"}
    assert match_for(participant, potential)["questions"] == []
    assert participant.post("/api/answers", json={"study_id": potential["id"], "answers": {"previous": True}}).status_code == 422


def test_numeric_choice_answers_and_per_account_isolation(client, researcher, participant):
    study = publish(researcher, rules=[
        rule("hours", "number", "between", "1,4", question="How many hours of puzzles do you play weekly?", source="Between one and four hours of puzzles per week."),
        rule("device", "choice", "in", "Laptop|Desktop", choices=["Laptop", "Desktop", "Phone"], question="Which device will you use?", source="Use a laptop or desktop."),
    ])
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"hours": True}}).status_code == 422
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"device": "Unknown device"}}).status_code == 422
    response = participant.post("/api/answers", json={"study_id": study["id"], "answers": {"hours": 2}})
    assert response.json()["status"] == "needs_screening"
    assert [question["id"] for question in match_for(participant, study)["questions"]] == ["device"]
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"device": "Laptop"}}).json()["status"] == "eligible"
    signup(client)
    assert client.put("/api/profile", json=profile_input()).status_code == 200
    assert len(match_for(client, study)["questions"]) == 2
    assert client.post("/api/answers", json={"study_id": study["id"], "answers": {"hours": 8}}).json()["status"] == "ineligible"
    assert study["id"] not in {item["id"] for item in get_matches(client)["matches"]}
    assert match_for(participant, study)["status"] == "eligible"


def test_scores_and_preferences_do_not_change_scientific_eligibility(researcher, participant):
    study = publish(researcher, compensation=10, duration=30, convenience_score=4)
    profile = profile_input(interests=["Puzzles & Memory Games", "Language & Words"], weights=dict(interest=1, compensation=3, convenience=1))
    assert participant.put("/api/profile", json=profile).status_code == 200
    before = get_matches(participant)
    match = next(item for item in before["matches"] if item["id"] == study["id"])
    assert match["components"] == dict(interest=3, compensation=4.2, convenience=4)
    assert match["score"] == 3.9
    profile.update(preferred_mode="in_person", preferred_location="London", max_duration=5, preferred_times=["evening"], interests=["Language & Words"], weights=dict(interest=5, compensation=1, convenience=1))
    assert participant.put("/api/profile", json=profile).status_code == 200
    after = get_matches(participant)
    assert {item["id"]: item["status"] for item in before["matches"]} == {item["id"]: item["status"] for item in after["matches"]}
    changed = next(item for item in after["matches"] if item["id"] == study["id"])
    assert changed["components"]["interest"] == 1
    assert changed["score"] == 1.9
    assert after["notifications"] == []
    profile["weights"] = dict(interest=0, compensation=0, convenience=0)
    assert participant.put("/api/profile", json=profile).status_code == 422


def test_booking_schedule_duplicates_and_researcher_visibility(researcher, participant, client):
    starts = datetime.now(timezone.utc) + timedelta(days=10)
    study = publish(researcher, slots=[dict(starts_at=starts.isoformat(), capacity=2), dict(starts_at=(starts + timedelta(hours=2)).isoformat(), capacity=2)])
    response = participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]})
    assert response.status_code in (200, 201), response.text
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][1]["id"]}).status_code == 409
    matches = get_matches(participant)
    booking = next(item for item in matches["bookings"] if item["study_id"] == study["id"])
    assert booking["title"] == study["title"]
    assert match_for(participant, study)["booked"] is True
    dashboard = researcher.get("/api/researcher/studies").json()
    assert next(item for item in dashboard["studies"] if item["id"] == study["id"])["booked_count"] == 1
    assert any(item["study_id"] == study["id"] for item in dashboard["bookings"])
    signup(client)
    assert client.put("/api/profile", json=profile_input()).status_code == 200
    assert get_matches(client)["bookings"] == []


def test_last_seat_atomic_and_overlap_rejected(client, researcher, participant):
    signup(client)
    assert client.put("/api/profile", json=profile_input()).status_code == 200
    study = publish(researcher)
    sessions = [client, participant]
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda session: session.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}), sessions))
    assert sorted(response.status_code for response in results) == [201, 409]
    winner = sessions[next(index for index, response in enumerate(results) if response.status_code == 201)]
    overlapping = publish(researcher, slots=[dict(starts_at=study["slots"][0]["starts_at"], capacity=2)])
    response = winner.post("/api/bookings", json={"slot_id": overlapping["slots"][0]["id"]})
    assert response.status_code == 409
    assert "overlap" in response.json()["detail"].lower()


def test_manual_safety_studies_cannot_be_booked(researcher, participant):
    study = publish(researcher, title="Brain imaging session", description="Attend an MRI scanning session.", requirements="MRI safety screening by the investigator is required.", manual_review=False)
    assert study["manual_review"] is True
    match = match_for(participant, study)
    assert match["status"] == "manual_review"
    assert match["questions"] == [] and match["slots"] == []
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409


def test_expired_slots_unknown_records_and_profile_changes_rechecked(researcher, participant):
    study = publish(researcher)
    slot_id = study["slots"][0]["id"]
    with main.database() as connection:
        connection.execute("UPDATE slots SET starts_at = ? WHERE id = ?", ((datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(), slot_id))
    assert participant.post("/api/bookings", json={"slot_id": slot_id}).status_code == 409
    assert participant.post("/api/bookings", json={"slot_id": 999999}).status_code == 404
    assert participant.post("/api/answers", json={"study_id": 999999, "answers": {"missing": True}}).status_code == 404
    age_study = publish(researcher, rules=[rule("age", "number", "between", "18,30", field="age", question="How old are you?", source="Participants aged18–30.")])
    assert participant.put("/api/profile", json=profile_input(age=50)).status_code == 200
    assert participant.post("/api/bookings", json={"slot_id": age_study["slots"][0]["id"]}).status_code == 409


def test_pdf_rejects_invalid_blank_too_many_pages_and_oversize(researcher):
    from pypdf import PdfWriter

    assert researcher.post("/api/extract/pdf", files={"file": ("invalid.pdf", b"Not a PDF", "application/pdf")}).status_code in (400, 422)
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = BytesIO()
    writer.write(buffer)
    response = researcher.post("/api/extract/pdf", files={"file": ("blank.pdf", buffer.getvalue(), "application/pdf")})
    assert response.status_code in (400, 422)
    for _ in range(20):
        writer.add_blank_page(width=200, height=200)
    buffer = BytesIO()
    writer.write(buffer)
    assert researcher.post("/api/extract/pdf", files={"file": ("large.pdf", buffer.getvalue(), "application/pdf")}).status_code in (400, 413, 422)
    assert researcher.post("/api/extract/pdf", files={"file": ("huge.pdf", b"%PDF-" + b"x" * (5 * 1024 * 1024), "application/pdf")}).status_code == 413


def test_password_and_session_tokens_hashed_and_expired_sessions_rejected(client):
    signup(client)
    session_token = client.cookies["studymatch_session"]
    with main.database() as connection:
        user = connection.execute("SELECT password_hash FROM users WHERE email = ?", ("new@example.test",)).fetchone()
        assert user["password_hash"] != PASSWORD
        assert PASSWORD not in user["password_hash"]
        stored = connection.execute("SELECT token_hash FROM sessions").fetchall()
        assert stored and all(row["token_hash"] != session_token for row in stored)
        connection.execute("UPDATE sessions SET expires_at = ?", ((datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),))
    assert client.get("/api/auth/me").status_code == 401
    assert client.put("/api/profile", json=profile_input()).status_code == 401


def test_password_whitespace_is_significant(client):
    email = "spaces@example.test"
    password = "  significant password  "
    response = client.post("/api/auth/signup", json={"name": "Spaces", "email": email, "password": password, "role": "participant"})
    assert response.status_code == 201
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"email": email, "password": password.strip()}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": password}).status_code == 200


def test_cross_origin_mutations_rejected_without_changing_account(participant):
    original = participant.get("/api/profile").json()
    changed = dict(original, name="Cross-origin attacker")
    response = participant.put("/api/profile", json=changed, headers={"Origin": "https://untrusted.example"})
    assert response.status_code == 403
    assert participant.get("/api/profile").json() == original
    assert participant.post("/api/auth/logout", headers={"Origin": "null"}).status_code == 403
    assert participant.get("/api/auth/me").status_code == 200
    assert participant.put("/api/profile", json=original, headers={"Origin": "http://testserver"}).status_code == 200


def text_pdf(text):
    stream = "BT /F1 12 Tf 20 180 Td (" + text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") + ") Tj ET"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 220] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        (f"<< /Length {len(stream.encode('ascii'))} >>\nstream\n{stream}\nendstream").encode("ascii"),
    ]
    document = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, item in enumerate(objects, 1):
        offsets.append(len(document))
        document.extend(f"{index} 0 obj\n".encode() + item + b"\nendobj\n")
    cross_reference = len(document)
    document.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        document.extend(f"{offset:010d} 00000 n \n".encode())
    document.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{cross_reference}\n%%EOF".encode())
    return bytes(document)


def mock_ai(monkeypatch, *, source="aged 18-35", **field_changes):
    from types import SimpleNamespace
    from backend.models import Extraction, StudyFields

    monkeypatch.setenv("OPENAI_API_KEY", "test-not-a-real-key")
    payload = study_input(**field_changes)
    fields = StudyFields(**{key: payload[key] for key in StudyFields.model_fields})
    extraction = Extraction(fields=fields, rules=[rule("age", "number", "between", "18,35", field="age", question="How old are you?", source=source)], manual_review=False, review_notes=[])
    calls = []

    def parse(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(output_parsed=extraction)

    monkeypatch.setattr(main, "OpenAI", lambda **kwargs: SimpleNamespace(responses=SimpleNamespace(parse=parse)))
    return calls


def test_pdf_extracts_text_and_uses_structured_ai_without_profiles(researcher, monkeypatch):
    calls = mock_ai(monkeypatch)
    source = "Visual puzzle study. Recruit people aged 18-35. One online 30-minute session, paying GBP10."
    response = researcher.post("/api/extract/pdf", files={"file": ("study.pdf", text_pdf(source), "application/pdf")})
    assert response.status_code == 200, response.text
    draft = response.json()
    assert draft["mode"] == "live" and source in draft["source_text"]
    assert draft["rules"][0]["field"] == "age"
    assert draft["fields"]["title"] == "Visual puzzle session"
    assert len(calls) == 1
    assert calls[0]["store"] is False
    assert source in str(calls[0]["input"])
    assert "I enjoy visual puzzles." not in str(calls[0]["input"])
    assert "participant@studymatch.demo" not in str(calls[0]["input"])


def test_ai_safety_lock_survives_researcher_edits(researcher, participant, monkeypatch):
    mock_ai(monkeypatch, description="An MRI scanning session for research.")
    response = researcher.post("/api/extract", json={"description": "Recruit adults aged 18-35 for an MRI scanning session.", "demo": False})
    assert response.status_code == 200, response.text
    draft = response.json()
    assert draft["manual_review"] is True
    payload = draft_payload(draft, manual_review=False, description="Complete a short visual puzzle task.", requirements="No extra criteria.", rules=[], review_notes=[])
    published = researcher.post("/api/studies", json=payload)
    assert published.status_code in (200, 201), published.text
    study = published.json()
    assert study["manual_review"] is True
    assert match_for(participant, study)["status"] == "manual_review"
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409


def test_ungrounded_ai_criteria_require_manual_review(researcher, monkeypatch):
    mock_ai(monkeypatch, source="This quote does not appear in the document.")
    response = researcher.post("/api/extract", json={"description": "Recruit people aged 18-35 for a visual puzzle task.", "demo": False})
    assert response.status_code == 200, response.text
    assert response.json()["manual_review"] is True
    assert response.json()["review_notes"]
