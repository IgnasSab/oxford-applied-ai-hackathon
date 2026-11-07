# StudyMatch AI

**AI-powered recruitment, eligibility screening, and study discovery for scientific research**

> **One-line pitch:** StudyMatch helps researchers find and book eligible participants with less manual screening, while giving participants a personalized feed of suitable, interesting, and convenient studies.

## 1. Problem

Research-participant recruitment remains fragmented. Participants often browse a long list of studies, read eligibility rules individually, and open studies one by one to find available sessions. Researchers may have to configure screening restrictions manually, check additional eligibility criteria by email, manage session slots, and coordinate sign-ups.

Traditional participant-pool systems, including Sona, already offer initial prescreen questionnaires, rule-based restrictions, study listings, time slots, and some email reminders. StudyMatch should therefore **not** be framed as inventing these functions. Its opportunity is to connect them through an adaptive eligibility engine, preference-aware matching, proactive notifications, and a unified booking calendar.

### Reference point: Oxford Psychology Research (OPR)

An example OPR/Sona prescreen supplied for product planning contains **31 questions in two sections** and is marked mandatory. Its questions cover:

- **General profile (14):** age, handedness, gender, first and additional languages, eyesight, psychology-study background, willingness to participate in drug/alcohol/brain-scan/TMS studies, parental deafness, and university affiliation.
- **Medical and safety (17):** seizures, family seizure history, fainting, concussion/head trauma, hearing issues, cochlear implants, pregnancy, metal in the body, implanted devices, pacemakers, infusion devices, medications, prior TMS/MRI, neurosurgery, anti-malarial treatment, and metal-related injuries.

**Important:** This is an example of one institution's prescreen, not a universal Sona questionnaire. **No actual participant responses, personal identifiers, or private research records are included in this repository brief.** Medical/safety details must not be repurposed as general-interest recommendation signals.

## 2. Product vision

StudyMatch transforms a passive study bulletin board into a **two-sided intelligent matching platform**:

- **For researchers:** Describe a study in natural language; review AI-extracted eligibility rules and proposed follow-up questions; publish time slots; monitor screened and booked participants.
- **For participants:** Complete a reusable initial prescreen, state what matters to them, browse eligible studies ranked by fit, answer only necessary follow-up questions, receive opt-in alerts about strong matches, and book from a week-at-a-glance calendar.

### Five components of the basic product

1. **Robust initial prescreen and preference profile**
2. **AI-powered, adaptive eligibility screening**
3. **Weighted personalized study ranking**
4. **Opt-in notifications about new high-match studies**
5. **Unified weekly study calendar and simple booking**

These five components define the **basic solution**. The integrations and agentic capabilities in Section 9 are deliberately out of MVP scope.

## 3. Participant onboarding: reusable profile

Participants complete an initial questionnaire once, updating responses when circumstances change.

### A. Core eligibility information

Examples (institutionally approved as appropriate):

- Age range; relevant demographic or student-affiliation fields
- Languages and proficiency
- Vision, hearing, handedness, and other reusable research characteristics
- Prior research participation recorded in the platform
- Study-type interests and opt-ins

Only collect fields that are needed for an approved research purpose. Safety-sensitive and health information should be minimized, access-restricted, and screened through appropriately approved workflows.

### B. New: participant preferences

Ask what the participant prioritizes:

- **Earnings:** compensation amount and/or compensation per hour
- **Interests:** cognition, neuroscience, decision-making, language, social psychology, etc.
- **Convenience:** duration, online versus in-person, location, general preferred times
- **Notifications:** whether to receive alerts and how frequently

Preferences affect **ranking**, not scientific eligibility.

## 4. Researcher workflow: study creation and eligibility

Researchers enter:

- Title and description
- Study format and location
- Duration and compensation
- Inclusion/exclusion criteria
- Available session slots (or a recurring slot pattern)
- Any required human-reviewed safety checks

### How the AI screening system works

**Example researcher description (fictional):**

> Recruit participants aged 18–35 who are fluent in English, have normal or corrected-to-normal vision, and have not participated in our previous visual search experiment.

**Processing pipeline:**

1. **Extract:** An LLM turns the researcher's natural-language criteria into structured candidate rules, with references to the source wording.
2. **Review:** The researcher approves or edits the criteria and proposed screening questions before publication.
3. **Match known data:** The eligibility engine compares the rules with permitted initial-prescreen fields and recorded participation history.
4. **Find gaps:** If a requirement cannot be verified, mark it **unknown**, not automatically eligible or ineligible.
5. **Ask only what's missing:** The LLM drafts a targeted, researcher-approved follow-up question for that study.
6. **Determine eligibility:** A deterministic rules engine evaluates the approved responses. Medical/safety or ambiguous cases are escalated to authorized human review where required.
7. **Proceed to booking:** Only confirmed eligible participants can finalize sign-up; participants requiring extra screening can finish the question first.

### Eligibility states

| State | Meaning | Participant-facing behavior |
|---|---|---|
| `eligible` | All required criteria confirmed | May view and book study |
| `needs_screening` | At least one required fact is unknown | May see a potential match and answer a short follow-up before booking |
| `ineligible` | A required criterion definitively fails | Excluded from the personalized eligible-study feed |
| `manual_review` | Requires investigator/safety review | No automatic approval; route to authorized team |

**Design constraint:** Do not reveal blinded or sensitive eligibility criteria when doing so could bias a study, and do not allow an LLM to independently approve participation in safety-critical studies.

## 5. Personalized study matching and discovery

The platform must apply **hard eligibility rules before any preference-based scoring**.

For eligible studies, compute a transparent weighted ranking score, for example:

```text
score(participant, study) =
  w_interest     * interest_match
+ w_compensation * compensation_match
+ w_convenience  * convenience_match
```

- The participant sets or chooses default weights; normalize them to sum to 1.
- `interest_match` measures study-topic affinity.
- `compensation_match` may consider both total compensation and hourly compensation.
- `convenience_match` reflects duration, online/in-person preference, location, and optionally declared availability.
- The score is a **recommendation score, not an eligibility probability**.
- Scores are best presented as relevance scores rather than scientifically calibrated percentages.

The participant feed should include:

- Recommended eligible studies in descending match score
- Clear pay, time, location, modality, and short “Why this study?” explanations
- An optional `needs_screening` queue for potentially suitable studies
- A way to view all available eligible studies, not only ranked recommendations
- Study details and direct booking actions

**Known ineligible studies should not appear in the eligible-study feed.**

## 6. Smart notifications

When a study is published or new places become available:

1. Re-evaluate potential matches using current eligibility and preferences.
2. Identify participants above an opt-in relevance threshold.
3. Send a concise push or email alert (subject to consent, permissions, and notification limits).
4. Allow the participant to open the study, complete any outstanding screening, and choose a session.

**Example fictional alert:**

> **New study matched to your interests**  
> Visual Attention — 45 minutes, £12, in person.  
> You're eligible based on the information we have. View available times.

Avoid excessive alerts: support quiet hours, frequency controls, deduplication, and user opt-out. Do not notify participants about studies for which revealing an invitation or eligibility would compromise an approved design.

## 7. Unified study calendar and booking

The basic app includes a **week-view calendar** of available slots across all eligible studies, without requiring personal calendar access.

Participant actions:

- Switch between **recommended study feed** and **weekly available study calendar**
- Filter by date, time, online/in-person, study topic, pay, and duration
- Select a session and see details (title, location, compensation, duration)
- Confirm booking after all required eligibility checks
- Receive confirmation and see booked sessions in the app

Researcher actions:

- Add one-off or recurring sessions in bulk
- Specify capacity and booking/cancellation windows
- View bookings and availability

For real deployments, booking should handle simultaneous claims on the last available space to prevent double-booking.

## 8. MVP / hackathon scope

**Goal:** Show the complete loop from researcher study creation to participant onboarding, screening, personalized discovery, alert, and booking.

### Suggested demo flow

1. A fictional participant signs up and completes a **representative initial prescreen** plus preference choices.
2. A researcher enters a new study description with one eligibility requirement missing from the prescreen.
3. The LLM extracts criteria and flags the missing requirement.
4. The researcher approves a generated follow-up question.
5. The participant sees the new study as a potential match, answers the question, and becomes eligible.
6. The participant's study feed re-ranks based on their compensation/interest/convenience preferences.
7. A simulated notification highlights a newly available high-match study.
8. The participant selects a slot in the weekly calendar and receives a simulated booking confirmation.
9. The researcher dashboard updates to show screening and booking status.

### Minimal components

- Synthetic data: ~50–100 participants, ~10 fictional studies, and synthetic session slots
- Participant signup/prescreen and preference-setting UI
- Researcher study-creation UI
- LLM criterion extraction and follow-up question drafting
- Approved deterministic eligibility rules engine
- Weighted recommendation engine
- Simulated push notification UI
- Weekly study calendar and basic booking persistence

### Proposed technical stack (illustrative)

- **Frontend:** Next.js/React or Streamlit
- **Backend:** Python/FastAPI or equivalent
- **Storage:** SQLite/PostgreSQL
- **AI:** LLM with structured JSON outputs and researcher approval
- **Matching:** Simple Python rule engine plus weighted ranking; no custom ML training required for MVP
- **Scheduling:** Database-backed slots and bookings with conflict checks

### Suggested measures of success

- Eligibility extraction accuracy against a hand-labeled sample
- False approvals / false exclusions on held-out synthetic profiles
- Number of extra screening questions asked per valid booking
- Participant time from discovery to confirmed booking
- Researcher time spent configuring eligibility and handling manual screening
- Study recommendation engagement and notification opt-out rates (later pilots)

Avoid claiming real-world improvements from synthetic demo results.

## 9. Later extensions (not part of the basic solution)

### Extension 1 — Personal calendar integration

Opt-in Google/Apple Calendar availability checking to recommend slots that fit participants' existing commitments. Only request necessary calendar permissions, and never reveal personal event titles to researchers.

### Extension 2 — Earnings dashboard and wallet

Track completed studies, expected compensation, pending payments, and earnings history. A future wallet or payout product could be explored. **Bank-account linking is optional and not required** to provide a useful earnings tracker; it adds financial-data, compliance, and security complexity.

### Extension 3 — Agentic communication

An opt-in agent handles approved routine reminders, rescheduling, cancellation messages, waitlist invitations, and researcher/participant communications. Escalate sensitive or ambiguous exchanges to humans. Keep a full audit trail.

### Extension 4 — Research-sample optimization (exploratory)

Potentially add researcher-defined recruitment quotas, under-recruited-stratum detection, and targeted discovery to support the study's scientifically justified sampling plan. Do **not** assume every study should maximize demographic diversity: random sampling, representative sampling, and targeted samples have different methodological requirements. This feature needs explicit researcher controls, ethical review where applicable, and bias evaluation.

## 10. Important product safeguards

- **Privacy by design:** Minimize prescreen data; particularly protect health and safety information.
- **Consent and transparency:** Explain how profiles are used for eligibility, matching, and notifications, and offer appropriate controls.
- **Role-based access:** Researchers should access only the participant information necessary for their approved study and role.
- **Researcher approval:** AI-generated screening questions and eligibility interpretations are reviewed before use.
- **Safety screening:** Do not substitute model-generated checks for specialist MRI/TMS/clinical safety processes.
- **Research integrity:** Do not expose blinded exclusions or over-personalize recruitment in ways that compromise sampling methodology.
- **Uncertainty handling:** Missing information is `needs_screening`, not automatically “no.”
- **Fairness:** Monitor whether ranking and notifications systematically reduce opportunities for particular groups, while respecting legitimate study inclusion rules.

## 11. Suggested positioning

**Not:** “Sona, but with AI.”

**Instead:** “An intelligent recruitment layer that turns static prescreen data and free-text study requirements into adaptive eligibility checks, personalized discovery, proactive alerts, and frictionless booking.”

The initial product can be standalone for demonstration, with potential future integration into institutionally approved research-management systems. Live integrations must be authorized by the relevant institution and vendor; they should not be assumed.

## 12. Short shareable pitch

> **StudyMatch** makes participating in scientific research easier for everyone. Participants complete an initial prescreen and tell us what kinds of studies they want to do. Researchers describe their study requirements, and our AI translates those requirements into structured eligibility checks. When existing prescreen data is insufficient, the system asks only the missing, researcher-approved questions. Eligible participants see a personalized feed of studies ranked by interest, compensation, and convenience; they can receive alerts about new strong matches and book directly through a weekly study calendar. Researchers spend less time screening and coordinating, while participants spend less time browsing irrelevant studies.

---

**Document status:** Early-stage product concept / hackathon specification. All user flows and examples are illustrative and do not constitute tested market, technical, privacy, or clinical claims.
