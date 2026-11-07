# StudyMatch API — current refinement contract

FastAPI + React/Vite; session cookies; ISO timestamps with timezone, calendar Europe/London. Errors {detail:string}. Preserve existing users, studies, answers and bookings in studymatch-v2.sqlite3. Pre-change DB backup exists locally. The changes below supersede the previous manual-rule publication API.

## Accounts and profiles
Auth endpoints unchanged: POST /api/auth/signup {name,email,password,role}; POST /api/auth/login {email,password}; POST /api/auth/logout; GET /api/auth/me. Account {id,name,email,role,onboarded}. Participants with incomplete new profiles have onboarded=false, retaining existing data.
GET /api/bootstrap → {topics,sample_description,ai_available,languages:string[],universities:string[]}.
GET /api/profile → profile or null. Legacy profiles return null for new unknown answers and birth_date; never invent a birthday from age.
PUT /api/profile accepts {name,birth_date:"YYYY-MM-DD",handedness,first_language,additional_languages:string[],english:boolean,vision:boolean,psychology_background:boolean,university,has_laptop:boolean,has_smartphone:boolean,has_headphones:boolean,comfortable_webcam:boolean,comfortable_audio_recording:boolean,comfortable_video_recording:boolean,free_response,interests,preferred_mode,preferred_location,max_duration,preferred_times,notifications,weights}.
Age is calculated from birth_date at eligibility-check time, never authored by client. Adult demo ages18–120. Existing real profiles need completion; seeded synthetic account may use authored fictional birth date/new answers.
Dropdown examples: languages English/French/German/Spanish/Mandarin/Hindi plus Other custom entry; universities University of Oxford/Oxford Brookes University/University of Cambridge/University College London/None plus Other custom entry. Backend accepts actual custom strings. Additional languages optional. Existing seven questions + additional languages + six equipment/recording questions =14 prescreen fields, excluding name/free response/preferences. Yes/no buttons require explicit selection; null is unknown.
psychology_background means academic education, not previous research participation. Recording willingness is not scientific or legal consent.

## Matching
GET /api/matches → {matches,bookings,notifications}, requires completed profile.
Match keeps previous public study fields/status/score/components/reasons/questions/booked, adds review_status:null|pending|approved|declined and review_note:string|null. No private requirements/rules/review_notes leaked.
Question {id,question,answer_type:boolean|number|choice,choices:string[]}; expected values private. POST /api/answers {study_id,answers} → {status}.
All new boolean prescreen fields may map to rules; additional_languages uses exact membership checks for language requirements. Age derives from birth_date. Normalize common university aliases (Oxford/University of Oxford; Cambridge/University of Cambridge; UCL/University College London; Oxford Brookes) to avoid false mismatches.
Ranking unchanged: objective hourly compensation1–5, interest-tag overlap1–5, fixed AI convenience1–5; participant-weighted mean. No per-participant LLM calls. Location/mode/duration/time preferences remain optional visible filters, never scientific eligibility. University only restricts eligibility when researcher description requires a specific affiliation.
POST /api/bookings {slot_id} → {id,title,starts_at}; preserve atomic capacity, overlap, duplicate study, past-slot and eligibility guards.

## AI-owned study preparation and publication
POST /api/extract {description,demo:false} and POST /api/extract/pdf multipart file stay; exact sample demo=true stays explicitly labelled offline fixture. Both return owned Extraction {draft_id,fields,rules,manual_review,review_notes,mode,source_text}.
NEW POST /api/studies/prepare accepts ONLY authored facts {title,description,mode,location,duration,compensation}. Description includes eligibility in natural language. AI generates public summary/description/tags, private requirements/rules, fixed convenience score/reason and manual flags. Return same Extraction shape. Use existing structured OpenAI call; never participant data.
CHANGE POST /api/studies accepts ONLY {draft_id,approved:true,slots:[{starts_at,capacity}]}. Server loads the owned unused draft; all published fields/rules/convenience/manual flags come from it. Reject missing draft, ownership violations, replay, and client-authored rules/ratings. No AI call at publish. Frontend invalidates prepared draft when author edits facts, then prepares again.
The researcher form has editable source facts and PDF/text import, then a concise read-only preview and publish approval. Remove rule/operator/expected-answer editors and convenience editor entirely. Advanced machine structures stay server-side. Missing API access shows failure and labelled fixture option, never fake AI.
GET /api/researcher/studies → {studies,bookings,review_requests}; only owned records. Researcher Study still contains internal fields for backward data compatibility, but UI does not show raw machinery.
NEW POST /api/researcher/studies/{study_id}/slots {slots:[{starts_at,capacity}]} → Study, owner only, future distinct times. Enables session addition after review.

## Actionable researcher review
A manual_review study needs a human decision. Its AI cannot clear a participant.
POST /api/review-requests participant {study_id,note:string} → {id,status:"pending"}. Only manual-review studies; one request per account+study; no duplicate pending requests. Do not request sensitive medical details in note.
Researcher review_requests entries {id,study_id,title,participant_name,note,status,created_at,decision_note}. Expose only to owning researcher.
POST /api/review-requests/{id}/decision researcher {decision:"approved"|"declined",note:string,eligibility_checked:boolean} → {id,status}. Approval requires eligibility_checked=true to attest that necessary eligibility/safety checks were completed outside this demo; decline does not. Owner only, pending only. Store decision and timestamp. This records a human decision; no medical clearance from AI.
An approved request removes the manual gate for THAT participant+study only. Still apply every supported rule, outstanding question and booking safeguard. Declined/pending requests cannot book. Participant sees status and researcher decision note; after approval eligible slots become available. No profile-wide clearance or global study unlock.

## Calendar/UI
Use an actual time-grid calendar: week/day navigation, date/time axes, green confirmed bookings, grey available eligible slots, text labels/legend as well as color, explicit confirm after selecting a grey slot. No drag-to-reschedule or external Google sync. Show conflict/full states; no auto-booking. Entire right sidebar (priorities, next session, alerts) can hide/reopen, reclaiming list width. Remove workspace header slogans and redundant ranking copy. Preserve synthetic-data disclosure.
