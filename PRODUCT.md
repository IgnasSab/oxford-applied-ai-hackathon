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
Real email/password signup and login; user chooses participant or researcher at registration. Participants onboard once. Researchers own their studies. PDF/text import autofills an editable draft; publication requires review. Eligibility is deterministic and separate from recommendation. Health, safety, unsupported and ambiguous requirements require manual review. No automatic clinical clearance.
Ranking: fixed per-study LLM convenience score; objective earnings; overlap with a shared list of 16 interest tags. Participant sliders combine three components into 1–5 relevance. Never send participant profiles to the model. Local only, no email verification/recovery or real notifications. No OCR, multi-session automatic booking, payments, or external calendars.

## Brand Commitments
User rejected the original cream/serif/hero design and selected a Linear-style operating workspace: compact navigation, crisp sans typography, restrained color, rows instead of decorative cards. Functional login and onboarding before the study feed. Code-first implementation explicitly chosen.

## Evidence on Hand
Project brief and supplied Sona screenshots/PDFs provide workflows and field structure. Completed prescreen responses include private personal/medical data: never copy these into repository, seed data, or AI calls. Study examples in app must be labelled synthetic, with invented people and availability.

## Product Principles
Ask only missing questions. Explain ranking. Preserve scientific eligibility independently of preferences. Review generated requirements before publication. Make the complete demo reliable within hours.
