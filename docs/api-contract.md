# StudyMatch API — combined prototype

FastAPI + React/Vite with same-origin session cookies. Timestamps include timezone; the calendar displays Europe/London. Preserve users, profiles, drafts, studies, answers, slots and bookings in `backend/studymatch-v2.sqlite3`; notifications use an additive table. Errors use `{detail:string}` or FastAPI validation details.

## Accounts and profiles

Auth stays unchanged: POST `/api/auth/signup` `{name,email,password,role}`, POST `/api/auth/login` `{email,password}`, POST `/api/auth/logout`, GET `/api/auth/me`. Account: `{id,name,email,role,onboarded}`. Core incomplete profiles still require completion; new optional questions do not invalidate existing completed accounts.

GET `/api/bootstrap` returns `{topics,sample_description,ai_available,languages,language_levels,universities,locations,prescreen_sections}`. Optional prescreen sections contain `{title,fields:[{field,label,type:"boolean"|"choice",options?:string[]}]}`. Language levels are Beginner, Intermediate and Fluent.

GET `/api/profile` returns profile or null. PUT `/api/profile` saves the core profile, optional extended answers and preferences. Existing names remain: `name,birth_date,handedness,first_language,additional_languages,english,vision,psychology_background,university,has_laptop,has_smartphone,has_headphones,comfortable_webcam,comfortable_audio_recording,comfortable_video_recording,free_response` plus preference fields below. Birth date is YYYY-MM-DD; age is calculated at evaluation time (adult demo 18–120). Never infer birth date from a legacy age.

Additional optional fields:
- `language_levels:{language:"Beginner"|"Intermediate"|"Fluent"}`. Existing `additional_languages` explicitly meant fluent languages; legacy values retain that meaning. New saves derive that fluent list from the proficiency map. Absent proficiency is unknown.
- `gender:null|"Woman"|"Man"|"Non-binary"|"Self-describe"|"Prefer not to say"`.
- Nullable booleans `willing_drugs,willing_alcohol,willing_brain_scan,willing_tms,parents_deaf,uk_university_student`.
- Nullable medical booleans `seizure_history,family_seizures,fainting_history,concussion_history,hearing_problems,cochlear_implants,pregnancy_possible,metal_in_body,implanted_neurostimulator,pacemaker_or_lines,infusion_device,medication_use,prior_tms,prior_mri,neurosurgery_or_eye_surgery,antimalarial_treatment,metal_injury`.

New answers default to null, never No. Use fictional medical data only. Medical answers stay private; they never determine recommendation scores or automatically clear safety eligibility. `psychology_background` means academic education, not prior research participation. Willingness to recordings/procedures is not consent.

PATCH `/api/preferences` independently updates provided preference fields: `{interests,preferred_mode,preferred_location,max_duration,preferred_times,notifications,weights,preference_filters}`. Returns updated profile; preserves other answers. `preference_filters` defaults false. Notification setting is off/immediate/weekly; frequency is a labelled in-app simulation. Weights retain interest/compensation/convenience, each 1–5. Topic choices use bootstrap topics.

## Matching and booking

GET `/api/matches` returns `{matches,bookings,notifications}` and requires a completed core profile. A match contains public study fields, `status,score,components,reasons,questions,booked,review_status,review_note`. Private rules, requirements, source text and review notes are not exposed to participants.

Evaluate known ordinary-rule failures first; omit ineligible studies even if another criterion is unknown or needs review. Missing facts become `needs_screening`. Unsupported, ambiguous, medical/safety and blinded requirements retain `manual_review`. An approved researcher decision clears only that participant/study's manual gate; ordinary rules and booking checks still apply.

Question: `{id,question,answer_type:"boolean"|"number"|"choice",choices}`. Expected answers stay private. POST `/api/answers` `{study_id,answers}` persists study-specific answers and returns `{status}`. Reuse known profile fields; university aliases are normalized. Language rules use `field:"language_levels",operator:"language_at_least",answer_type:"choice",value:'{"language":"French","level":"Intermediate"}'` and choices `["None","Beginner","Intermediate","Fluent"]`. Known proficiency is compared; unknown proficiency receives a targeted question.

Ranking is the participant-weighted mean of interest overlap, hourly earnings and saved AI convenience, each 1–5; no per-participant model calls. Topic and match-status filters are frontend views. Legacy format/location/duration/time preference fields remain stored for compatibility but are no longer applied by discovery.

POST `/api/bookings` `{slot_id}` returns `{id,title,starts_at}`. Preserve atomic capacity, overlapping-time, duplicate-study, past-slot and eligibility guards. Confirmed bookings persist independently of later discovery filters.

## AI preparation and publication

POST `/api/extract` `{description,demo:false}` and POST `/api/extract/pdf` multipart `file` return owned Extraction `{draft_id,fields,rules,manual_review,review_notes,mode,source_text}`. `demo:true` only accepts the exact sample and is labelled a fixture. Text PDFs: at most 5 MB/20 pages, no OCR.

POST `/api/studies/prepare` accepts `{title,description,mode,location?,duration,compensation,tags}`. At least one known researcher-selected tag is required. In-person location is required; online blank/omitted location becomes Online. Description includes eligibility in natural language. Authored facts/topics override extracted suggestions. AI supplies clean public prose, private requirements, source-grounded rules, follow-up questions and convenience score/reason. It receives study text only, never participant data.

Imported editable description uses cleaned `fields.description` plus `fields.requirements`, never the raw PDF dump. Retain `source_text` separately for review. Ignore document instructions and strip page headers, footers, navigation, URLs, contact details and administrative clutter from public prose. Retain every inclusion/exclusion requirement and verbatim evidence; ambiguous or garbled requirements require human review rather than guesses.

POST `/api/studies` accepts only `{draft_id,approved:true,slots:[{starts_at,capacity}]}`. Load owned unused draft; reject client-authored rules/ratings, missing/foreign drafts and replay. No model call at publication. Editing source facts/topics invalidates the prepared preview. No raw rule or convenience editors.

GET `/api/researcher/studies` returns owned `{studies,bookings,review_requests}`. POST `/api/researcher/studies/{study_id}/slots` `{slots:[{starts_at,capacity}]}` adds future distinct sessions for the owner.

## Review and notifications

POST `/api/review-requests` participant `{study_id,note}` returns `{id,status:"pending"}`. Only manual-review studies, one request per participant/study. Never request sensitive details in notes. Researcher queue entries: `{id,study_id,title,participant_name,note,status,created_at,decision_note}`.

POST `/api/review-requests/{id}/decision` researcher `{decision:"approved"|"declined",note,eligibility_checked:boolean}` returns `{id,status}`. Owner and pending-only; approval requires attestation that necessary external checks are complete. No AI clinical clearance.

GET `/api/notifications` returns `{notifications:[{id,study_id,kind,title,message,created_at}]}`, newest first and participant-scoped. `study_id` is null for historical events whose study is no longer visible to the participant. Kinds: eligible, potential, booking, review. Match alerts respect opt-in, score threshold and deduplication; stale/ineligible suggestions are suppressed. Booking/review events are persisted. `/api/matches.notifications` returns the same safe list for compatibility. No email or push delivery.

## UI contract

Collapsible left navigation retains the logo without a participant/researcher label beneath it. No right preference or score sidebar. Signup submits the questionnaire, interests and priority weights together before discovery. Completed profiles retain direct tabs and separate saves. The medical questionnaire and format/location/duration/time/notification preference controls are removed from the UI; their stored data and API fields remain compatible. Discovery combines format/search with topic and match-state filters. Notifications has its own page. Calendar has week/day navigation, 90px minimum half-hour rows, wrapped titles, green confirmed bookings, grey available sessions, explicit confirmation and an adjacent upcoming-bookings list (stacked on mobile). No external calendar synchronization.

Login slogan: Find the right research, without the search. Researcher import label: Simple PDF or text import.

Relevant questionnaire/proficiency/notification concepts are ported from the supplied friends prototype. Its unauthenticated Streamlit storage is not used.
