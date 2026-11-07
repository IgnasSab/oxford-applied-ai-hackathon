# Oxford Applied AI Hackathon — StudyMatch

Private workspace for a **3–4 person team** at Oxford Edge, **7 November 2026**. StudyMatch helps participants discover research, complete only missing screening questions, and book a session. Researchers review AI-extracted study details and eligibility rules before publication. React/Vite + FastAPI + SQLite; Impeccable guided the interface redesign.

## Run locally

Requires **Python 3.12** and **Node.js 22.12+**. From the repository root on Windows:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm --prefix frontend ci
npm --prefix frontend run build
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. FastAPI serves the built frontend and API together. On macOS/Linux use `python3.12` and `.venv/bin/python`. During frontend development, `npm --prefix frontend run dev` proxies API requests to port 8000.

Optional live extraction: copy `.env.example` to `.env` and set `OPENAI_API_KEY`. Never commit it. Only researcher-provided study text goes to the model; participant profiles do not. PDF extraction accepts text PDFs up to 5 MB and 20 pages. Scans need pasted text. AI failures are surfaced; the explicitly labelled sample works offline.

## How AI and matching work

FastAPI calls OpenAI through the Python SDK's `responses.parse`, using `gpt-4.1-mini` by default (`OPENAI_MODEL` can override it). A structured-output request turns researcher text into clean public study fields, private eligibility rules, additional questions and a convenience score. The prompt excludes page headers, footers, navigation, URLs and administrative clutter from descriptions while retaining inclusion/exclusion requirements and verbatim evidence separately. Pydantic validates the response; source quotations and review flags are checked before storing the draft. PDF text is extracted locally first. The editable description uses cleaned prose and requirements rather than the raw PDF dump. Researchers choose topics, correct facts and approve publication; ratings and rules remain AI-prepared. Editing facts requires a fresh preparation.

Eligibility and ranking run in Python against saved data. Birth date supplies current age; university requirements use normalized names, and language requirements use explicit proficiency. Known ordinary failures are excluded first. Unknown facts become targeted questions; answers persist per participant and study. Safety-sensitive or ambiguous requirements retain human review. Participant profiles, medical answers and review notes never go to OpenAI. Seeded examples and the labelled fixed example use synthetic fixture results.

Each score component is between 1 and 5:

- Interest = 1 + 4 × (shared topic count / participant's selected topic count); 1 when no interests are selected.
- Earnings = 1 + 4 × min(hourly compensation / £25, 1).
- Convenience = the stored AI rating of study burden, from 1 (specialist preparation/high burden) to 5 (short online session with little setup).
- Final preference score = weighted mean of those three components, rounded to one decimal. The three weights are selected during signup and edited in Profile & preferences. This is not an eligibility probability.

Discovery filters by format, topic and eligibility state. The extra location/duration/time preference controls and their hidden filtering behavior are removed; interests and priority weights remain. Notifications are participant-scoped SQLite records for matches, bookings and review decisions; match alerts respect opt-in and are deduplicated. Delivery/frequency remains an in-app demonstration, with no external messages.

## Accounts and demo

Create an account using email and password and choose Participant or Researcher. Participants complete the core prescreen before browsing and can edit preferences directly. Accounts, profiles, reviewed studies, answers, sessions, bookings and notifications persist in ignored `backend/studymatch-v2.sqlite3`. Existing accounts keep their data and bookings. Additional general questions are optional. The medical questionnaire is removed from the interface; existing stored answers are preserved. Use fictional answers in the demo.

Synthetic seeded accounts (both use password `StudyMatch2026!`):

- Participant: `participant@studymatch.demo`
- Researcher: `researcher@studymatch.demo`

Demo flow:

1. Sign up as a participant; complete the core prescreen, select interests and adjust priorities in the same form, then choose Find studies. Additional general questions are optional; additional languages have proficiency levels.
2. Open Profile & preferences to edit interests and priority sliders directly, independently of the prescreen. Browse studies by format, topic and eligibility state.
3. Open a potential match and answer only remaining questions. The calendar shows booked sessions in green and available sessions in grey, with upcoming bookings listed beside it.
4. Sign in as researcher. Enter study facts or use Simple PDF or text import. Choose topics and, for an in-person study, location. AI prepares a cleaned description and screening. Review, add slots and publish.
5. View matching alerts, booking confirmations and review decisions on Notifications. Studies needing human review offer a request button and an owned researcher review queue. Each request shows participant contact/basic details, full requirements, reasons for review and relevant current answers alongside expected answers. Missing and failing answers are explicit; known failures block approval. Only the study owner receives this context, without unrelated profile answers or medical history. Approval clears manual review only; remaining screening still applies before booking.

The combined version ports the broader questionnaire, language proficiency, topic discovery and stored-notification ideas from the supplied `friends/app.py`, `engine.py`, `ai.py` and `storage.py`. It retains this app's authenticated React/FastAPI workflow and existing database; the friend's separate Streamlit account selector and datastore are not used.

## Scope and team handoff

- Frontend owner: `frontend/`. Backend owner: `backend/`. Product/pitch owner: demo story and rehearsal. Fourth teammate: evaluation/integration. Read [API contract](docs/api-contract.md) before changes; avoid shared-file edits in parallel.
- Run `.\.venv\Scripts\python.exe -m pytest -q` and `npm --prefix frontend run build` before handoff.
- Earnings uses hourly compensation, interest uses shared tags, convenience is a fixed AI-generated 1–5 study rating. The explicitly labelled offline fixture and seeded examples use fixed synthetic scores. Weighted average is calculated without participant-specific model calls. Preferences rank; eligibility uses explicit rules.
- Local hackathon demo with synthetic data. Real password/session authentication, but no email verification, password recovery, production deployment, payments, external calendar sync, OCR, or multi-session booking.
- Notifications are simulated in-app. Medical, safety-sensitive, conditional or unresolved criteria block automatic booking until a researcher records completed external eligibility/safety checks for that participant. Ordinary screening rules and booking safeguards still apply. AI does not grant clinical clearance.
- Design context: [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md). The broader [project brief](STUDYMATCH_PROJECT_BRIEF.md) includes future scope beyond this demo.

Event: https://luma.com/lpwg9cq4  
Team and submission workspace: https://app.hack-nation.ai/e/hack-nation-oxford-hackathon

## Event constraints

- All times GMT. Latest reminder says doors open at 09:00; the earlier schedule lists registration from 08:45. Briefing 09:30; team formation 09:50.
- 10:00–12:00: problem/opportunity sprint, with feedback 11:30–12:00. Lunch 12:00–13:00.
- 13:00–15:00: build sprint, with checkpoint/feedback 14:30–15:00.
- 15:00–16:00: commercialisation and pitch. Submission/preparation 16:00–16:15.
- 16:15–17:30: final pitches, **5 minutes + 3 minutes Q&A** each. Awards and closing finish at 18:00.
- Organisers promise **Lovable and Dotwave AI credits** and allow personal AI tools. Amounts and redemption details are unspecified; OpenAI API credits are not confirmed.
- Source: organiser emails from Ng Hong Wei and Hack-Nation, 6 November 2026. Check event announcements for changes and rules on prebuilt code.

## Roles and ownership

Agree owners before coding. For three people:

- **Pitch/product:** own the problem, audience, value proposition, evidence of impact, why now, and pitch rehearsal. Help development when the pitch is on track.
- **Frontend:** own a minimal, self-explanatory interface and demo flow. Remove filler and generic AI copy; use a coherent visual reference and clear charts where useful.
- **Backend:** one primary owner for APIs, LLM calls, data processing, and storage.

With a fourth person, assign **experiments, evaluation, and integration/demo reliability**, with explicit file ownership. Avoid simultaneous edits to the same files. Nominate one integration owner regardless of team size.

## Rules of thumb for humans and agents

1. **Prepare the tools.** Confirm everyone's coding agent works and everyone can clone, push, and pull. Codex is the planned tool; teammates can use familiar alternatives. The original advice recommended Claude Code Max, but buying it is not a team requirement. Test required API access separately from coding-agent subscriptions. Never commit credentials; keep secrets in local environment files.
2. **Think before building.** Agree the user problem, methodology, smallest useful demo, and success criteria. Spend roughly the first hour testing the riskiest assumptions in a separate experiment chat. Humans own product and methodological decisions; agents implement and test them.
3. **Evaluate concrete results.** An optional second LLM can judge outputs or review the UI and feed improvements back to the builder. Use explicit criteria, sample cases, and human checks; a judge's approval is not proof of correctness. Keep iterations bounded.
4. **Coordinate through a contract.** Keep frontend and backend in separate folders. Maintain endpoint, request/response, and error examples in Markdown API contracts. Agree changes, commit/push the contract, then have both sides implement it. Separate folders reduce conflicts but do not eliminate them. Use focused branches and small commits; integrate frequently.
5. **Keep agent work focused.** Maintain a main frontend chat and a main backend chat. Use a coordinating agent and subagents for clearly bounded tasks when useful, with explicit ownership and acceptance criteria. Don't delegate every trivial edit or let multiple agents modify shared files concurrently.
6. **Protect the demo and pitch.** Aim for one working end-to-end flow before lunch. Leave integration buffers before checkpoints and final submission. Do not depend on any model finishing the whole product in one attempt. Freeze features early enough to rehearse and verify the demo; slides are useful, generated videos are optional and costly in time/tokens.
7. **Build only what earns its place.** Skip login, extra infrastructure, and speculative features unless the chosen problem needs them. Update this README with the selected challenge, owners, run commands, and demo instructions once agreed.
