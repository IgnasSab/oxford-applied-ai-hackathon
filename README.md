# Oxford Applied AI Hackathon

Private workspace for a team of **3–4 people** at Oxford Edge on **7 November 2026**. Our product is **StudyMatch**: researcher-approved eligibility screening, personalized study discovery, and booking. This branch contains a deliberately small synthetic-data demo using a buildless HTML/CSS/JavaScript frontend, FastAPI, and SQLite.

## Run the demo

Requires **Python 3.12**. From this directory on Windows:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. No frontend build or separate server is needed. On macOS/Linux, use `python3.12 -m venv .venv` and `.venv/bin/python` for the commands above.

The existing `.env` is ignored. To enable live extraction on another laptop, copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The **sample extraction** option works offline only for the supplied example and is labelled as a fixed fixture. Live API failures are shown rather than silently replaced with fake AI results. No participant profiles are sent to the LLM; only the researcher's description is sent.

### Demo walkthrough

1. Choose fictional participant Alex; inspect the ranked studies and edit preference weights.
2. Switch to Researcher. Enter a study using the example criteria, extract live or use the labelled sample, review the rules/questions, add a future slot, and explicitly approve publication.
3. Switch back to Alex. Find the potential match and answer **No** to previous visual-search participation. The study becomes eligible.
4. Choose a session from its card or weekly calendar and book. Repeated, overlapping, full, past, and ineligible bookings are rejected by the server.
5. Open Researcher to see the booking. Opted-in participants see simulated in-app alerts for eligible high-relevance studies; no email or push messages are sent.

### Team handoff and limits

- Frontend owner edits `frontend/`; backend owner edits `backend/`; product/pitch owner maintains demo examples and presentation. Assign individual names as a team.
- Read [the API contract](docs/api-contract.md) before changing either side. SQLite persists profiles, approved studies, answers, and bookings in ignored `backend/studymatch.sqlite3`.
- Run focused checks with `.\.venv\Scripts\python.exe -m pytest -q` and `node --check frontend/app.js`.
- Three fictional profiles and six studies keep the demo inspectable. Create more through the UI if needed.
- **Local synthetic-data prototype only:** the role switch is not authentication. Do not expose it publicly or enter real participant/medical data. No real registration, email, PDF ingestion, recurring sessions, cancellation, payments, or calendar integration.
- AI extraction is a draft. Researcher approval is required; ambiguous/safety-sensitive studies remain in manual review with automatic booking disabled. This is not clinical clearance, a validated screening system, or a production replacement for Sona.
- Sites plugin guidance informs the local frontend workflow. Sites hosting requires a JavaScript Worker and cannot directly run this FastAPI backend; no hosted deployment is configured.

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
