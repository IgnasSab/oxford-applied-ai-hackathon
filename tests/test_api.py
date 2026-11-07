from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
import json

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


def birth_date_for_age(age):
    return date(date.today().year - age, 1, 1).isoformat()


def profile_input(**changes):
    profile = dict(
        name="Fictional tester", birth_date=birth_date_for_age(24), handedness="right", first_language="English",
        additional_languages=["French"], has_laptop=True, has_smartphone=True, has_headphones=True,
        comfortable_webcam=True, comfortable_audio_recording=False, comfortable_video_recording=False,
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
        title="Visual puzzle session", summary="Try a set of visual puzzles.",
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
    study = study_input(**changes)
    author = {key: study[key] for key in ("title", "description", "mode", "location", "duration", "compensation", "tags")}
    author["description"] += "\n" + study["requirements"] + "\n" + "\n".join(item["source"] for item in study["rules"])
    with pytest.MonkeyPatch.context() as monkeypatch:
        mock_ai(monkeypatch, study=study)
        prepared = researcher.post("/api/studies/prepare", json=author)
    assert prepared.status_code == 200, prepared.text
    response = researcher.post("/api/studies", json=draft_payload(prepared.json(), slots=study["slots"]))
    assert response.status_code == 201, response.text
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
    payload = dict(draft_id=draft["draft_id"], approved=True, slots=study_input()["slots"])
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
    assert participant.post("/api/studies", json=dict(draft_id=1, approved=True, slots=study_input()["slots"])).status_code == 403
    assert researcher.get("/api/profile").status_code == 403
    assert researcher.get("/api/matches").status_code == 403
    original = participant.get("/api/profile").json()
    signup(client)
    assert client.get("/api/profile").json() is None
    assert client.put("/api/profile", json=profile_input(birth_date=birth_date_for_age(33))).status_code == 200
    assert participant.get("/api/profile").json() == original
    assert "participants" not in client.get("/api/bootstrap").json()


def test_researcher_studies_and_drafts_have_owners(client, researcher):
    private_study = publish(researcher)
    draft = sample_draft(researcher)
    signup(client, "other-researcher@example.test", "researcher")
    assert client.get("/api/researcher/studies").json() == {"studies": [], "bookings": [], "review_requests": []}
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
    payload = draft_payload(draft)
    response = researcher.post("/api/studies", json=payload)
    assert response.status_code in (200, 201), response.text
    assert response.json()["title"] == draft["fields"]["title"]
    assert response.json()["convenience_score"] == draft["fields"]["convenience_score"]
    assert response.json()["rules"] == draft["rules"]
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
    assert participant.put("/api/profile", json=profile_input(birth_date=birth_date_for_age(50))).status_code == 200
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


def mock_ai(monkeypatch, *, study=None, source="aged 18-35", **field_changes):
    from types import SimpleNamespace
    from backend.models import Extraction, StudyFields

    monkeypatch.setenv("OPENAI_API_KEY", "test-not-a-real-key")
    payload = study_input(**field_changes) if study is None else study
    fields = StudyFields(**{key: payload[key] for key in StudyFields.model_fields})
    rules = [rule("age", "number", "between", "18,35", field="age", question="How old are you?", source=source)] if study is None else study["rules"]
    extraction = Extraction(fields=fields, rules=rules, manual_review=payload["manual_review"], review_notes=payload["review_notes"])
    calls = []

    def parse(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(output_parsed=extraction)

    monkeypatch.setattr(main, "OpenAI", lambda **kwargs: SimpleNamespace(responses=SimpleNamespace(parse=parse)))
    return calls


def test_pdf_extracts_text_and_uses_structured_ai_without_profiles(researcher, participant, monkeypatch):
    calls = mock_ai(monkeypatch)
    source = "Department of Experimental Psychology. Study Information. Page 1 of 3. Visual puzzle study. Recruit people aged 18-35. One online 30-minute session, paying GBP10. View Time Slots. Privacy Policy."
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
    assert draft["fields"]["description"] == study_input()["description"]
    with main.database() as connection:
        saved = json.loads(connection.execute("SELECT data FROM drafts WHERE id=?", (draft["draft_id"],)).fetchone()["data"])
    assert source in saved["source_text"]
    assert saved["fields"]["description"] == draft["fields"]["description"]
    published = researcher.post("/api/studies", json=draft_payload(draft))
    assert published.status_code == 201, published.text
    match = match_for(participant, published.json())
    assert match["description"] == draft["fields"]["description"]
    assert "source_text" not in match
    assert "Privacy Policy" not in match["description"]


def test_ai_safety_lock_cannot_be_overridden_at_publication(researcher, participant, monkeypatch):
    mock_ai(monkeypatch, description="An MRI scanning session for research.")
    response = researcher.post("/api/extract", json={"description": "Recruit adults aged 18-35 for an MRI scanning session.", "demo": False})
    assert response.status_code == 200, response.text
    draft = response.json()
    assert draft["manual_review"] is True
    payload = draft_payload(draft, manual_review=False, description="Complete a short visual puzzle task.", requirements="No extra criteria.", rules=[], review_notes=[])
    assert researcher.post("/api/studies", json=payload).status_code == 422
    published = researcher.post("/api/studies", json=draft_payload(draft))
    assert published.status_code == 201, published.text
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


def test_preparation_owns_rules_and_convenience_without_profile_input(researcher, monkeypatch):
    source = "Complete a browser puzzle task. Recruit people aged 18-35."
    authored = dict(title="Visual puzzle session", description=source, mode="online", location="Online", duration=30, compensation=10, tags=["Puzzles & Memory Games"])
    assert researcher.post("/api/studies/prepare", json=authored).status_code == 503
    calls = mock_ai(monkeypatch, convenience_score=4.6)
    assert researcher.post("/api/studies/prepare", json=dict(authored, convenience_score=1)).status_code == 422
    response = researcher.post("/api/studies/prepare", json=authored)
    assert response.status_code == 200, response.text
    draft = response.json()
    assert draft["fields"]["convenience_score"] == 4.6
    assert len(calls) == 1
    model_input = str(calls[0]["input"])
    assert source in model_input
    assert "I enjoy visual puzzles." not in model_input
    assert "participant@studymatch.demo" not in model_input
    for extra in ({"convenience_score": 1}, {"rules": []}, {"manual_review": False}, {"title": "Unreviewed replacement"}):
        assert researcher.post("/api/studies", json=draft_payload(draft, **extra)).status_code == 422
    assert researcher.post("/api/studies", json={"approved": True, "slots": study_input()["slots"]}).status_code == 422
    response = researcher.post("/api/studies", json=draft_payload(draft))
    assert response.status_code == 201, response.text
    assert response.json()["convenience_score"] == 4.6
    assert response.json()["rules"] == draft["rules"]
    assert len(calls) == 1


def test_birth_date_required_and_new_boolean_answers_are_explicit(client):
    signup(client)
    profile = profile_input()
    assert client.put("/api/profile", json=dict(profile, age=24)).status_code == 422
    for birthday in (birth_date_for_age(17), birth_date_for_age(121), (date.today() + timedelta(days=1)).isoformat()):
        assert client.put("/api/profile", json=dict(profile, birth_date=birthday)).status_code == 422
    assert client.put("/api/profile", json=dict(profile, has_laptop=None)).status_code == 422
    assert client.put("/api/profile", json=dict(profile, comfortable_video_recording="false")).status_code == 422
    assert client.put("/api/profile", json=profile).status_code == 200
    saved = client.get("/api/profile").json()
    assert saved["birth_date"] == profile["birth_date"]
    assert saved["comfortable_video_recording"] is False
    assert "age" not in saved
    bootstrap = client.get("/api/bootstrap").json()
    assert {"English", "French", "Spanish"}.issubset(bootstrap["languages"])
    assert {"University of Oxford", "Oxford Brookes University"}.issubset(bootstrap["universities"])


def test_age_recomputed_on_birthday_and_ignores_stale_age(monkeypatch):
    from backend import matching

    participant = profile_input(birth_date="2000-05-20")
    participant["age"] = 99
    study = study_input(rules=[rule("age", "number", "between", "18,25", field="age", source="aged 18-25")])
    for today, expected in ((date(2026, 5, 19), "eligible"), (date(2026, 5, 20), "ineligible")):
        class CurrentDate(date):
            @classmethod
            def today(cls):
                return today

        monkeypatch.setattr(matching, "date", CurrentDate)
        assert matching.eligibility(participant, study, {})[0] == expected


def test_legacy_profile_requires_completion_without_losing_accounts_or_bookings(client, researcher):
    account = signup(client, "legacy@example.test").json()
    assert client.put("/api/profile", json=profile_input()).status_code == 200
    study = publish(researcher)
    assert client.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 201
    legacy = profile_input()
    legacy["age"] = 24
    new_fields = ("birth_date", "additional_languages", "has_laptop", "has_smartphone", "has_headphones", "comfortable_webcam", "comfortable_audio_recording", "comfortable_video_recording")
    for field in new_fields:
        legacy.pop(field)
    with main.database() as connection:
        connection.execute("UPDATE participants SET data=? WHERE user_id=?", (json.dumps(legacy), account["id"]))
        original_user = dict(connection.execute("SELECT * FROM users WHERE id=?", (account["id"],)).fetchone())
        original_bookings = [dict(row) for row in connection.execute("SELECT * FROM bookings WHERE participant_id=?", (account["id"],))]
    with TestClient(main.app) as reopened:
        login(reopened, account["email"])
        assert reopened.get("/api/auth/me").json()["onboarded"] is False
        saved = reopened.get("/api/profile").json()
        assert saved["birth_date"] is None
        assert saved["has_laptop"] is None
        assert saved["free_response"] == legacy["free_response"]
        assert reopened.get("/api/matches").status_code in (403, 409)
        assert reopened.put("/api/profile", json=profile_input()).status_code == 200
        assert reopened.get("/api/auth/me").json()["onboarded"] is True
        assert any(booking["study_id"] == study["id"] for booking in get_matches(reopened)["bookings"])
    with main.database() as connection:
        assert dict(connection.execute("SELECT * FROM users WHERE id=?", (account["id"],)).fetchone()) == original_user
        assert [dict(row) for row in connection.execute("SELECT * FROM bookings WHERE participant_id=?", (account["id"],))] == original_bookings


def test_university_aliases_new_prescreen_fields_and_language_membership(researcher, participant):
    study = publish(researcher, rules=[
        rule("affiliation", "choice", "equals", "University of Oxford", field="university", source="University of Oxford participants."),
        rule("device", value="true", field="has_laptop", source="A laptop is required."),
        rule("language", "choice", "equals", "French", field="additional_languages", source="Speaks French as an additional language."),
        rule("video", value="false", field="comfortable_video_recording", source="Participants are not comfortable being video recorded."),
    ])
    profile = profile_input(university="Oxford", additional_languages=["french"])
    assert participant.put("/api/profile", json=profile).status_code == 200
    assert match_for(participant, study)["status"] == "eligible"
    for changes in ({"university": "University of Cambridge"}, {"has_laptop": False}, {"additional_languages": ["French sign language"]}, {"comfortable_video_recording": True}):
        assert participant.put("/api/profile", json=dict(profile, **changes)).status_code == 200
        assert study["id"] not in {item["id"] for item in get_matches(participant)["matches"]}
    assert participant.put("/api/profile", json=profile).status_code == 200
    assert match_for(participant, study)["questions"] == []


def test_review_approval_is_owned_explicit_and_scoped_to_one_participant(client, researcher, participant):
    study = publish(researcher, manual_review=True, rules=[
        rule("age", "number", "between", "18,35", field="age", source="Participants aged 18-35."),
        rule("previous"),
    ])
    response = participant.post("/api/review-requests", json={"study_id": study["id"], "note": "Please arrange the external checks."})
    assert response.status_code in (200, 201), response.text
    request = response.json()
    assert request["status"] == "pending"
    assert participant.post("/api/review-requests", json={"study_id": study["id"], "note": "Duplicate"}).status_code == 409
    assert match_for(participant, study)["review_status"] == "pending"
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409
    decision_path = f"/api/review-requests/{request['id']}/decision"
    decision = dict(decision="approved", note="Required external checks completed for this synthetic participant.", eligibility_checked=True)
    assert participant.post(decision_path, json=decision).status_code == 403
    signup(client, "foreign-reviewer@example.test", "researcher")
    assert client.get("/api/researcher/studies").json()["review_requests"] == []
    assert client.post(decision_path, json=decision).status_code in (403, 404)
    assert researcher.post(decision_path, json=dict(decision, eligibility_checked=False)).status_code == 422
    queue = researcher.get("/api/researcher/studies").json()["review_requests"]
    assert any(item["id"] == request["id"] and item["note"] == "Please arrange the external checks." for item in queue)
    assert researcher.post(decision_path, json=decision).status_code == 200
    assert researcher.post(decision_path, json=decision).status_code == 409
    approved = match_for(participant, study)
    assert approved["review_status"] == "approved"
    assert approved["review_note"] == decision["note"]
    assert approved["status"] == "needs_screening"
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"previous": False}}).json()["status"] == "eligible"
    assert participant.put("/api/profile", json=profile_input(birth_date=birth_date_for_age(50))).status_code == 200
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409
    assert participant.put("/api/profile", json=profile_input()).status_code == 200
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 201
    with TestClient(main.app) as other:
        signup(other, "unreviewed@example.test")
        assert other.put("/api/profile", json=profile_input()).status_code == 200
        assert match_for(other, study)["review_status"] is None
        assert match_for(other, study)["status"] == "manual_review"
        assert other.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409


def test_declined_review_stays_blocked_and_ordinary_studies_cannot_request_review(researcher, participant):
    ordinary = publish(researcher)
    assert participant.post("/api/review-requests", json={"study_id": ordinary["id"], "note": "Please review."}).status_code in (409, 422)
    study = publish(researcher, manual_review=True)
    response = participant.post("/api/review-requests", json={"study_id": study["id"], "note": "Please review."})
    assert response.status_code in (200, 201), response.text
    request = response.json()
    response = researcher.post(f"/api/review-requests/{request['id']}/decision", json={"decision": "declined", "note": "External checks are not complete.", "eligibility_checked": False})
    assert response.status_code == 200, response.text
    match = match_for(participant, study)
    assert match["review_status"] == "declined"
    assert match["review_note"] == "External checks are not complete."
    assert match["slots"] == []
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409


def test_review_shows_relevant_current_answers_and_missing_information_only_to_owner(client, researcher, participant):
    profile = profile_input(gender="Man", medication_use=True, free_response="Private unrelated profile note.")
    assert participant.put("/api/profile", json=profile).status_code == 200
    requirements = "Adults aged 18-35 without a psychology background. Intermediate French required. No prior participation. Researcher confirmation required."
    reason = "Confirm the additional requirements with the participant."
    study = publish(researcher, requirements=requirements, manual_review=True, review_notes=[reason], rules=[
        rule("age", "number", "between", "18,35", field="age", question="How old are you?", source="Adults aged 18-35"),
        rule("psychology", field="psychology_background", question="Do you have a psychology background?", source="without a psychology background"),
        rule("french", "choice", "language_at_least", json.dumps({"language": "French", "level": "Intermediate"}), field="language_levels",
             choices=["None", "Beginner", "Intermediate", "Fluent"], question="What is your French proficiency?", source="Intermediate French required"),
        rule("previous"),
    ])
    response = participant.post("/api/review-requests", json={"study_id": study["id"], "note": "Please review my request."})
    assert response.status_code == 201, response.text
    request_id = response.json()["id"]
    request = next(item for item in researcher.get("/api/researcher/studies").json()["review_requests"] if item["id"] == request_id)
    assert request["participant_info"] == dict(age=24, gender="Man", university="Oxford", first_language="English", email="participant@studymatch.demo")
    assert request["requirements"] == requirements
    assert reason in request["review_notes"]
    checks = {check["id"]: check for check in request["screening_checks"]}
    assert checks["age"]["answer"] == 24 and checks["age"]["expected_answer"] == "18–35"
    assert checks["age"]["status"] == "met" and checks["age"]["answer_source"] == "profile"
    assert checks["psychology"]["answer"] is False and checks["psychology"]["expected_answer"] == "No"
    assert checks["psychology"]["status"] == "met"
    assert checks["french"]["answer"] == "Fluent" and checks["french"]["expected_answer"] == "Intermediate or higher in French"
    assert checks["previous"]["answer"] is None and checks["previous"]["answer_source"] is None
    assert checks["previous"]["status"] == "missing"
    for private in ("birth_date", "medication_use", "free_response", "Private unrelated profile note.", "weights", "password_hash"):
        assert private not in json.dumps(request)
    assert participant.get("/api/researcher/studies").status_code == 403
    signup(client, "review-context-outsider@example.test", "researcher")
    assert client.get("/api/researcher/studies").json()["review_requests"] == []
    assert researcher.post(f"/api/review-requests/{request_id}/decision", json={"decision": "approved", "note": "Manual checks completed.", "eligibility_checked": True}).status_code == 200
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"previous": False}}).status_code == 200
    updated = next(item for item in researcher.get("/api/researcher/studies").json()["review_requests"] if item["id"] == request_id)
    previous = next(check for check in updated["screening_checks"] if check["id"] == "previous")
    assert previous["answer"] is False and previous["answer_source"] == "study" and previous["status"] == "met"


def test_review_rechecks_changed_profile_before_approval(researcher, participant):
    study = publish(researcher, manual_review=True, rules=[
        rule("age", "number", "between", "18,35", field="age", source="Participants aged 18-35."),
        rule("previous"),
    ])
    response = participant.post("/api/review-requests", json={"study_id": study["id"], "note": "Please review."})
    assert response.status_code == 201, response.text
    request_id = response.json()["id"]
    assert participant.put("/api/profile", json=profile_input(birth_date=birth_date_for_age(50))).status_code == 200
    request = next(item for item in researcher.get("/api/researcher/studies").json()["review_requests"] if item["id"] == request_id)
    assert request["participant_info"]["age"] == 50
    assert [check["status"] for check in request["screening_checks"]] == ["not_met", "missing"]
    path = f"/api/review-requests/{request_id}/decision"
    response = researcher.post(path, json={"decision": "approved", "note": "Reviewed.", "eligibility_checked": True})
    assert response.status_code == 409
    with main.database() as connection:
        assert connection.execute("SELECT status FROM review_requests WHERE id=?", (request_id,)).fetchone()["status"] == "pending"
        assert connection.execute("SELECT count(*) FROM notifications WHERE study_id=? AND kind='review'", (study["id"],)).fetchone()[0] == 0
    assert researcher.post(path, json={"decision": "declined", "note": "Current requirements are not met.", "eligibility_checked": False}).status_code == 200


def test_review_without_structured_rules_keeps_full_requirements_and_unknown_profile(researcher, participant):
    study = publish(researcher, manual_review=True, requirements="Researcher must confirm the conditional clothing requirements.", review_notes=["Clothing requirements need individual confirmation."])
    request_id = participant.post("/api/review-requests", json={"study_id": study["id"], "note": "Please review."}).json()["id"]
    participant_id = participant.get("/api/auth/me").json()["id"]
    legacy_profile = profile_input()
    legacy_profile.pop("birth_date")
    with main.database() as connection:
        connection.execute("UPDATE participants SET data=? WHERE user_id=?", (json.dumps(legacy_profile), participant_id))
    request = next(item for item in researcher.get("/api/researcher/studies").json()["review_requests"] if item["id"] == request_id)
    assert request["requirements"] == study["requirements"]
    assert "Clothing requirements need individual confirmation." in request["review_notes"]
    assert request["screening_checks"] == []
    assert request["participant_info"]["age"] is None and request["participant_info"]["gender"] is None


def test_researcher_can_add_future_distinct_sessions_only_to_owned_study(client, researcher, participant):
    study = publish(researcher, manual_review=True, slots=[])
    path = f"/api/researcher/studies/{study['id']}/slots"
    payload = {"slots": study_input()["slots"]}
    assert participant.post(path, json=payload).status_code == 403
    signup(client, "other-slot-owner@example.test", "researcher")
    assert client.post(path, json=payload).status_code in (403, 404)
    past = dict(starts_at=(datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(), capacity=1)
    assert researcher.post(path, json={"slots": [past]}).status_code == 422
    assert researcher.post(path, json={"slots": payload["slots"] * 2}).status_code == 422
    response = researcher.post(path, json=payload)
    assert response.status_code in (200, 201), response.text
    assert len(response.json()["slots"]) == 1
    assert researcher.post(path, json=payload).status_code in (409, 422)


def preferences_input(**changes):
    profile = profile_input()
    preferences = {key: profile[key] for key in ("interests", "preferred_mode", "preferred_location", "max_duration", "preferred_times", "notifications", "weights")}
    preferences["preference_filters"] = False
    preferences.update(changes)
    return preferences


def test_optional_prescreen_keeps_existing_profiles_complete_and_answers_private(client, participant, researcher):
    account = participant.get("/api/auth/me").json()
    old_profile = profile_input()
    with main.database() as connection:
        connection.execute("UPDATE participants SET data=? WHERE user_id=?", (json.dumps(old_profile), account["id"]))
    assert participant.get("/api/auth/me").json()["onboarded"] is True
    profile = participant.get("/api/profile").json()
    assert profile["gender"] is None and profile["seizure_history"] is None
    assert profile["language_levels"] == {"French": "Fluent"}
    bootstrap = participant.get("/api/bootstrap").json()
    fields = [field for section in bootstrap["prescreen_sections"] for field in section["fields"]]
    assert {"gender", "parents_deaf", "willing_tms", "uk_university_student", "seizure_history", "metal_injury"}.issubset({field["field"] for field in fields})
    assert len(next(section["fields"] for section in bootstrap["prescreen_sections"] if "safety" in section["title"].lower())) == 17
    assert bootstrap["language_levels"] == ["Beginner", "Intermediate", "Fluent"]
    assert bootstrap["locations"]
    changed = dict(profile, gender="Woman", parents_deaf=False, uk_university_student=True,
                   seizure_history=False, pregnancy_possible=None, medication_use=True,
                   language_levels={"French": "Fluent", "German": "Beginner"})
    response = participant.put("/api/profile", json=changed)
    assert response.status_code == 200, response.text
    assert participant.put("/api/profile", json=dict(changed, seizure_history="false")).status_code == 422
    saved = participant.get("/api/profile").json()
    assert saved["medication_use"] is True and saved["pregnancy_possible"] is None
    with TestClient(main.app) as reopened:
        login(reopened, account["email"])
        assert reopened.get("/api/profile").json() == saved
    with main.database() as connection:
        stored = json.loads(connection.execute("SELECT data FROM participants WHERE user_id=?", (account["id"],)).fetchone()["data"])
    assert stored["seizure_history"] is False and stored["language_levels"]["German"] == "Beginner"
    signup(client, "private-prescreen@example.test")
    assert client.get("/api/profile").json() is None
    assert researcher.get("/api/profile").status_code == 403
    dashboard = researcher.get("/api/researcher/studies").text
    assert all(field not in dashboard for field in ("seizure_history", "medication_use", "language_levels"))
    medical = publish(researcher, title="Synthetic MRI session", description="Attend a synthetic MRI scanning session.", manual_review=True)
    assert match_for(participant, medical)["status"] == "manual_review"


def test_preferences_save_independently_and_preserve_prescreen_answers_and_bookings(client, researcher, participant):
    participant_id = participant.get("/api/auth/me").json()["id"]
    assert participant.put("/api/profile", json=profile_input(gender="Woman", medication_use=True)).status_code == 200
    study = publish(researcher, rules=[rule("previous")])
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"previous": False}}).status_code == 200
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 201
    before = participant.get("/api/profile").json()
    with main.database() as connection:
        answers_before = connection.execute("SELECT data FROM answers WHERE participant_id=? AND study_id=?", (participant_id, study["id"])).fetchone()["data"]
    preferences = preferences_input(interests=["Language & Words"], preferred_mode="online", preferred_location="Oxford", preference_filters=True,
                                    notifications="weekly", weights=dict(interest=5, compensation=2, convenience=1))
    response = participant.patch("/api/preferences", json=preferences)
    assert response.status_code == 200, response.text
    saved = response.json()
    assert {key: saved[key] for key in preferences} == preferences
    assert {key: saved[key] for key in before if key not in preferences} == {key: value for key, value in before.items() if key not in preferences}
    assert any(booking["study_id"] == study["id"] for booking in get_matches(participant)["bookings"])
    with main.database() as connection:
        assert connection.execute("SELECT data FROM answers WHERE participant_id=? AND study_id=?", (participant_id, study["id"])).fetchone()["data"] == answers_before
    partial = participant.patch("/api/preferences", json={"weights": {"interest": 4}})
    assert partial.status_code == 200, partial.text
    assert partial.json()["weights"] == dict(interest=4, compensation=2, convenience=1)
    assert {key: value for key, value in partial.json().items() if key != "weights"} == {key: value for key, value in saved.items() if key != "weights"}
    saved = partial.json()
    assert researcher.patch("/api/preferences", json=preferences).status_code == 403
    assert client.patch("/api/preferences", json=preferences).status_code == 401
    assert participant.patch("/api/preferences", json=dict(preferences, medication_use=False)).status_code == 422
    assert participant.patch("/api/preferences", json=dict(preferences, interests=["Invented topic"])).status_code == 422
    assert participant.get("/api/profile").json() == saved


def test_researcher_topics_override_ai_and_online_location_is_optional(researcher, monkeypatch):
    calls = mock_ai(monkeypatch, tags=["Puzzles & Memory Games"])
    authored = dict(title="Language session", description="Recruit people aged 18-35 for a word task.", mode="online", duration=30, compensation=10, tags=["Language & Words"])
    for invalid in ([], ["Invented topic"], ["Language & Words", "Language & Words"]):
        assert researcher.post("/api/studies/prepare", json=dict(authored, tags=invalid)).status_code == 422
    assert calls == []
    for location in (None, "", "  "):
        payload = authored if location is None else dict(authored, location=location)
        response = researcher.post("/api/studies/prepare", json=payload)
        assert response.status_code == 200, response.text
        assert response.json()["fields"]["location"] == "Online"
        assert response.json()["fields"]["tags"] == ["Language & Words"]
    draft = response.json()
    assert researcher.post("/api/studies", json=draft_payload(draft, tags=["Puzzles & Memory Games"])).status_code == 422
    published = researcher.post("/api/studies", json=draft_payload(draft))
    assert published.status_code == 201, published.text
    assert published.json()["tags"] == ["Language & Words"]
    for location in (None, "", "  "):
        payload = dict(authored, mode="in_person")
        if location is not None:
            payload["location"] = location
        assert researcher.post("/api/studies/prepare", json=payload).status_code == 422
    response = researcher.post("/api/studies/prepare", json=dict(authored, mode="in_person", location="Oxford · Experimental Psychology"))
    assert response.status_code == 200, response.text
    assert response.json()["fields"]["location"] == "Oxford · Experimental Psychology"


def test_known_failure_wins_over_missing_questions_and_human_review(researcher, participant):
    study = publish(researcher, manual_review=True, rules=[
        rule("previous"),
        rule("older", "number", "between", "70,90", field="age", source="Participants aged 70-90."),
    ])
    assert study["id"] not in {item["id"] for item in get_matches(participant)["matches"]}
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"previous": False}}).status_code == 422


def test_missing_optional_general_answer_is_asked_and_persisted_only_for_that_study(researcher, participant):
    study = publish(researcher, rules=[rule("student", value="true", field="uk_university_student", question="Are you a UK-based university student?", source="Participants must be UK-based university students.")])
    profile = participant.get("/api/profile").json()
    assert profile["uk_university_student"] is None
    match = match_for(participant, study)
    assert match["status"] == "needs_screening"
    assert [question["id"] for question in match["questions"]] == ["student"]
    response = participant.post("/api/answers", json={"study_id": study["id"], "answers": {"student": True}})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "eligible"
    assert participant.get("/api/profile").json()["uk_university_student"] is None
    assert match_for(participant, study)["questions"] == []
    assert participant.put("/api/profile", json=dict(profile, uk_university_student=False)).status_code == 200
    assert study["id"] not in {item["id"] for item in get_matches(participant)["matches"]}


def test_language_proficiency_uses_exact_language_and_only_asks_unknown_levels(client, researcher, participant):
    study = publish(researcher, rules=[rule(
        "french", "choice", "language_at_least", json.dumps({"language": "French", "level": "Intermediate"}),
        field="language_levels", choices=["None", "Beginner", "Intermediate", "Fluent"],
        question="What is your French proficiency?", source="Participants need at least intermediate French.",
    )])
    for profile in (
        profile_input(language_levels={"French": "Intermediate"}),
        profile_input(language_levels={"french": "Fluent"}),
        profile_input(first_language="French", language_levels={}),
    ):
        assert participant.put("/api/profile", json=profile).status_code == 200
        assert match_for(participant, study)["status"] == "eligible"
    assert participant.put("/api/profile", json=profile_input(language_levels={"French": "Beginner"})).status_code == 200
    assert study["id"] not in {item["id"] for item in get_matches(participant)["matches"]}
    profile = profile_input(language_levels={"French sign language": "Fluent"})
    assert participant.put("/api/profile", json=profile).status_code == 200
    match = match_for(participant, study)
    assert match["status"] == "needs_screening"
    assert match["questions"] == [{"id": "french", "question": "What is your French proficiency?", "answer_type": "choice", "choices": ["None", "Beginner", "Intermediate", "Fluent"]}]
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"french": "Advanced"}}).status_code == 422
    assert participant.post("/api/answers", json={"study_id": study["id"], "answers": {"french": "Intermediate"}}).json() == {"status": "eligible"}
    assert participant.get("/api/profile").json()["language_levels"] == profile["language_levels"]
    assert participant.put("/api/profile", json=profile_input(language_levels={"French": "Beginner"})).status_code == 200
    assert study["id"] not in {item["id"] for item in get_matches(participant)["matches"]}
    signup(client, "no-french@example.test")
    assert client.put("/api/profile", json=profile_input(language_levels={})).status_code == 200
    assert match_for(client, study)["status"] == "needs_screening"
    assert client.post("/api/answers", json={"study_id": study["id"], "answers": {"french": "None"}}).json() == {"status": "ineligible"}


def test_notifications_opt_in_persist_deduplicate_and_suppress_stale_matches(client, researcher, participant):
    assert participant.put("/api/profile", json=profile_input()).status_code == 200
    eligible = publish(researcher, rules=[rule("age", "number", "between", "18,35", field="age", source="Participants aged 18-35.")])
    potential = publish(researcher, rules=[rule("previous")])
    studied_ids = {eligible["id"], potential["id"]}
    assert participant.get("/api/notifications").json() == {"notifications": []}
    assert participant.patch("/api/preferences", json={"notifications": "immediate"}).status_code == 200
    response = participant.get("/api/notifications")
    assert response.status_code == 200, response.text
    alerts = [item for item in response.json()["notifications"] if item["study_id"] in studied_ids]
    assert {(item["study_id"], item["kind"]) for item in alerts} == {(eligible["id"], "eligible"), (potential["id"], "potential")}
    assert all(set(item) == {"id", "study_id", "kind", "title", "message", "created_at"} for item in alerts)
    assert all(item["title"] and item["message"] and datetime.fromisoformat(item["created_at"]).tzinfo for item in alerts)
    assert [item["created_at"] for item in alerts] == sorted((item["created_at"] for item in alerts), reverse=True)
    repeated = [item for item in participant.get("/api/notifications").json()["notifications"] if item["study_id"] in studied_ids]
    assert repeated == alerts
    assert [item for item in get_matches(participant)["notifications"] if item["study_id"] in studied_ids] == alerts
    participant_id = participant.get("/api/auth/me").json()["id"]
    with main.database() as connection:
        saved = [dict(row) for row in connection.execute("SELECT id,participant_id,study_id,kind FROM notifications WHERE study_id IN (?,?)", tuple(studied_ids))]
    assert {item["id"] for item in saved} == {item["id"] for item in alerts}
    assert {item["participant_id"] for item in saved} == {participant_id}
    assert researcher.get("/api/notifications").status_code == 403
    assert client.get("/api/notifications").status_code == 401
    signup(client, "notification-isolation@example.test")
    assert client.put("/api/profile", json=profile_input()).status_code == 200
    assert client.get("/api/notifications").json() == {"notifications": []}
    assert participant.post("/api/answers", json={"study_id": potential["id"], "answers": {"previous": True}}).json() == {"status": "ineligible"}
    assert potential["id"] not in {item["study_id"] for item in participant.get("/api/notifications").json()["notifications"]}
    assert participant.put("/api/profile", json=profile_input(birth_date=birth_date_for_age(70), notifications="immediate")).status_code == 200
    assert not studied_ids.intersection(item["study_id"] for item in participant.get("/api/notifications").json()["notifications"])
    with main.database() as connection:
        assert connection.execute("SELECT count(*) FROM notifications WHERE study_id IN (?,?)", tuple(studied_ids)).fetchone()[0] == 2
    assert participant.patch("/api/preferences", json={"notifications": "off"}).status_code == 200
    assert participant.get("/api/notifications").json() == {"notifications": []}


def test_booking_and_review_notifications_persist_when_match_alerts_are_off(client, researcher, participant):
    assert participant.put("/api/profile", json=profile_input()).status_code == 200
    study = publish(researcher, rules=[rule("age", "number", "between", "18,35", field="age", source="Participants aged 18-35.")])
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 201
    review_study = publish(researcher, manual_review=True)
    response = participant.post("/api/review-requests", json={"study_id": review_study["id"], "note": "Please arrange the external checks."})
    assert response.status_code == 201, response.text
    request = response.json()
    decision_path = f"/api/review-requests/{request['id']}/decision"
    decision = dict(decision="approved", note="External checks completed.", eligibility_checked=True)
    assert researcher.post(decision_path, json=decision).status_code == 200
    assert researcher.post(decision_path, json=decision).status_code == 409
    alerts = participant.get("/api/notifications").json()["notifications"]
    assert {(item["study_id"], item["kind"]) for item in alerts} == {(study["id"], "booking"), (review_study["id"], "review")}
    assert len(alerts) == 2
    assert participant.get("/api/notifications").json()["notifications"] == alerts
    assert participant.post("/api/bookings", json={"slot_id": study["slots"][0]["id"]}).status_code == 409
    assert participant.get("/api/notifications").json()["notifications"] == alerts
    account = participant.get("/api/auth/me").json()
    with TestClient(main.app) as reopened:
        login(reopened, account["email"])
        assert reopened.get("/api/notifications").json()["notifications"] == alerts
    signup(client, "transaction-notification-isolation@example.test")
    assert client.put("/api/profile", json=profile_input()).status_code == 200
    assert client.get("/api/notifications").json() == {"notifications": []}
    assert participant.put("/api/profile", json=profile_input(birth_date=birth_date_for_age(70))).status_code == 200
    retained = participant.get("/api/notifications").json()["notifications"]
    assert {item["id"] for item in retained} == {item["id"] for item in alerts}
    assert next(item for item in retained if item["kind"] == "booking")["study_id"] is None
