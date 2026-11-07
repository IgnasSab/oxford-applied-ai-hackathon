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

## Accounts and demo

Create an account using email and password and choose Participant or Researcher. Participants complete the short profile and preferences before browsing. Accounts, profiles, reviewed studies, answers, sessions and bookings persist in ignored `backend/studymatch-v2.sqlite3`. The old prototype database remains untouched.

Synthetic seeded accounts (both use password `StudyMatch2026!`):

- Participant: `participant@studymatch.demo`
- Researcher: `researcher@studymatch.demo`

Demo flow:

1. Sign up as a participant; complete the seven-field profile, optional free response, and interests.
2. Browse ranked studies. Move the three sliders to change priority; the 1–5 preference score is distinct from eligibility.
3. Open a study needing screening. Answer only its remaining questions, then select a future session. Check the schedule.
4. Sign in as researcher. Create a study manually, paste text, or upload a PDF. Review editable details, convenience rating, rules and source evidence; add a slot and approve publication.
5. The new study appears to matching participants; confirmed bookings appear in its researcher's dashboard.

## Scope and team handoff

- Frontend owner: `frontend/`. Backend owner: `backend/`. Product/pitch owner: demo story and rehearsal. Fourth teammate: evaluation/integration. Read [API contract](docs/api-contract.md) before changes; avoid shared-file edits in parallel.
- Run `.\.venv\Scripts\python.exe -m pytest -q` and `npm --prefix frontend run build` before handoff.
- Earnings uses hourly compensation, interest uses shared tags, convenience is a fixed researcher-approved 1–5 study rating. Weighted average is calculated without participant-specific model calls. Preferences filter/rank; eligibility uses explicit rules.
- Local hackathon demo with synthetic data. Real password/session authentication, but no email verification, password recovery, production deployment, payments, external calendar sync, OCR, or multi-session booking.
- Notifications are simulated in-app. Medical, safety-sensitive, conditional or unresolved criteria require investigator review and block automatic booking. A screening match is not clinical clearance.
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
