# StudyMatch demo API

FastAPI serves the buildless frontend at `/` and JSON under `/api`. Synthetic local demo, no authentication. All dates ISO 8601 with timezone; display Europe/London. Errors use `{"detail":"message"}`. No secrets in client code.

## Data

Participant: `{id, name, age, english, vision, interests: string[], preferred_mode: "online"|"in_person"|"any", max_duration: number, weights: {interest, compensation, convenience}, notifications: boolean}`. English and vision are boolean or null (unknown). Interests use cognition, language, decision-making, social psychology, neuroscience.

Rule: `{id, field: "age"|"english"|"vision"|"question", operator: "between"|"equals", value: string, question: string, source: string}`. Age value is `18,35`; boolean values are `true` or `false`. Question rules use study-specific answers keyed by rule id. Editable only in researcher draft review. All question rules are boolean.

Study: `{id, title, description, topic, mode: "online"|"in_person", location, duration, compensation, rules: Rule[], manual_review: boolean, slots: [{id, starts_at, capacity, remaining}], booked_count}`.

Match: Study plus `{status: "eligible"|"needs_screening"|"manual_review", score: number|null, reasons: string[], questions: [{id, question}], booked: boolean}`. Ineligible studies never returned. Manual-review studies expose no screening criteria/questions. Participant API omits rules for all studies. Score is 0–100 relevance, not probability.

## Endpoints

- `GET /api/bootstrap` → `{participants: Participant[], topics: string[], sample_description: string, ai_available: boolean}`.
- `POST /api/participants` with participant fields excluding id → Participant. `PUT /api/participants/{id}` same body → Participant.
- `GET /api/participants/{id}/matches` → `{matches: Match[], notifications: [{id, study_id, title, message}], bookings: [{id, study_id, title, starts_at, duration, location}]}`. Notifications simulated in-app, opt-in, eligible high matches only.
- `POST /api/participants/{id}/answers` body `{study_id, answers: {rule_id: boolean}}` → `{status}`. Refresh matches afterward.
- `POST /api/bookings` body `{participant_id, slot_id}` → `{id, title, starts_at}`. Eligibility rechecked server-side; full, duplicate, past, or overlapping bookings rejected with 409. Unknown ids 404.
- `GET /api/researcher/studies` → `{studies: Study[], bookings: [{id, study_id, title, participant_name, starts_at}]}`.
- `POST /api/extract` body `{description: string, demo: boolean}` → `{draft_id, rules: Rule[], manual_review: boolean, review_notes: string[], mode: "live"|"sample"}`. `demo:true` only accepts the exact bootstrap sample_description, uses a clearly labelled fixed fixture; arbitrary text requires live AI. Errors surfaced, never disguised as AI output.
- `POST /api/studies` body `{draft_id, title, description, topic, mode, location, duration, compensation, rules: Rule[], manual_review: boolean, approved: true, slots: [{starts_at, capacity}]}` → Study. Draft source must match description. At least one future slot. Safety/manual review requirement cannot be removed by client. Reviewer can edit rules/questions. Request `approved:false` rejected.

Frontend workflow: role switch (Participant / Researcher), fictional profile picker + profile form, recommendation cards + potential-match questions, week-view slots + bookings, notification panel; researcher creation → extraction review → explicit approval/publish → booking dashboard. No real auth, messages, PDF ingestion, payments, or calendar sync.
