# StudyMatch
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React/Vite frontend, existing FastAPI backend, SQLite. Single local application after frontend build. Python 3.12.

## Users
Research participants discovering suitable studies; researchers recruiting and booking participants. Hackathon judges see a working local demonstration with synthetic data.

## Product Purpose
Replace repeated screening and manual browsing with reusable profiles, researcher-reviewed AI extraction, preference ranking, targeted additional questions, and booking.

## Capabilities and Constraints
Real email/password signup and login; user chooses participant or researcher at registration. The reusable prescreen includes optional general prompts and language proficiency. The medical/safety questionnaire is removed from the UI; stored legacy answers remain intact. Birth date supplies age; additional languages have explicit proficiency levels. Legacy accounts retain their answers and bookings without invented data. Signup saves the questionnaire, interests and priority sliders together before discovery. Existing accounts can edit interests/priorities independently. Researchers own their studies and select topics and an in-person location. PDF/text import or authored facts produce an AI-prepared draft with clean public prose separate from original source text and private eligibility requirements. AI owns screening rules and convenience ratings; researchers correct source facts and approve a concise preview, without rule or rating editors. Known ordinary eligibility failures are excluded before unknown questions or human-review gates. Health, safety, unsupported and ambiguous requirements require a participant review request and a decision by the owning researcher. Approval records completed external checks, applies only to that participant/study, and never bypasses other rules or booking guards. No AI clinical clearance.
Ranking: fixed per-study LLM convenience score; objective earnings; overlap with shared interest tags. Sliders in Profile & preferences combine three components into 1–5 relevance. Never send participant profiles to the model. In-app notifications are stored, deduplicated and scoped to the signed-in participant; delivery remains simulated. Local only, no email verification/recovery or external notifications. No OCR, multi-session automatic booking, payments, or external calendars.

## Brand Commitments
User selected a Linear-style operating workspace: compact navigation, crisp sans typography, restrained color, rows instead of decorative cards. The left navigation collapses while retaining the logo. Interests and priority sliders appear during signup and in Profile & preferences; there are no right preference or score sidebars. Discovery filters format, topic and eligibility status. Notifications have their own page. Schedule uses a Google Calendar-style time grid with green bookings, grey available sessions, explicit booking confirmation and an adjacent upcoming-bookings list. Login slogan: Find the right research, without the search.

## Evidence on Hand
Project brief and supplied Sona screenshots/PDFs provide workflows and field structure. Completed prescreen responses include private personal/medical data: never copy these into repository, seed data, or AI calls. Study examples in app must be labelled synthetic, with invented people and availability.

## Product Principles
Ask only missing questions. Explain ranking. Preserve scientific eligibility independently of preferences. Review generated requirements before publication. Make the complete demo reliable within hours.
