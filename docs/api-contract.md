# StudyMatch API — rebuild

FastAPI serves Vite build at /. JSON /api. ISO timestamps with timezone; UI Europe/London. Errors {detail:string} (422 validation can be arrays). Session cookies. No participant ids from clients.

## Authentication
- POST /api/auth/signup {name,email,password,role:"participant"|"researcher"} → Account + cookie.
- POST /api/auth/login {email,password} → Account + cookie.
- POST /api/auth/logout → {ok:true}.
- GET /api/auth/me → Account or401.
- Account {id,name,email,role,onboarded:boolean}. Password ≥8. Researcher onboarded immediately.
- GET /api/bootstrap public → {topics:string[],sample_description:string,ai_available:boolean}. No profiles.

## Participant
Profile {name,age,handedness:"left"|"right"|"ambidextrous",first_language,english:boolean,vision:boolean,psychology_background:boolean,university,free_response,interests:string[],preferred_mode:"online"|"in_person"|"any",preferred_location:string,max_duration:number,preferred_times:string[],notifications:"off"|"immediate"|"weekly",weights:{interest:number,compensation:number,convenience:number}}.
Age18–120; max_duration5–480; weights1–5 default3. Times morning/afternoon/evening. Optional preferences default any/empty/480. Preferences never alter scientific eligibility.
psychology_background means academic psychology education. Prior research participation is a separate study-specific question.
- GET /api/profile → Profile or null, participant only.
- PUT /api/profile full Profile → Profile; marks onboarded.
- GET /api/matches → {matches:Match[],bookings:Booking[],notifications:Notification[]}; requires onboarding.
- Match: public Study + {status:"eligible"|"needs_screening"|"manual_review",score:number,components:{interest:number,compensation:number,convenience:number},reasons:string[],questions:Question[],booked:boolean}. Known-ineligible excluded. Score1–5 provisional for unknown eligibility. NEVER expose rules/requirements/review_notes. Only eligible studies expose slots.
- Question {id,question,answer_type:"boolean"|"number"|"choice",choices:string[]}. Expected answers private.
- POST /api/answers {study_id,answers:{rule_id:boolean|number|string}} → {status}. Only outstanding questions accepted; validate type and choices. Refresh matches.
- POST /api/bookings {slot_id} → {id,title,starts_at}. Atomically recheck eligibility, duplicate study, full/past/conflicting sessions;409 conflict.
- Booking {id,study_id,title,starts_at,duration,location,mode}.
- Notification {id,study_id,title,message}; simulated inapp only.
Fixed scores: compensation=1+4*min((compensation*60/duration)/25,1); interest=1+4*overlap/participant_interest_count (empty→1); convenience=study convenience_score1–5. Overall weighted average one decimal. Frontend reranks locally with sliders; persists weights via save. Optional mode/location/duration/time filters frontend only.

## Researcher
Study {title,summary,description,requirements,mode:"online"|"in_person",location,duration:number,compensation:number,tags:string[],convenience_score:number,convenience_reason:string,rules:Rule[],manual_review:boolean,review_notes:string[]}.
Public Study removes requirements/rules/review_notes, adds {id,slots:Slot[],booked_count:number}. Researcher Study includes all fields.
Rule {id,field:"age"|"handedness"|"first_language"|"english"|"vision"|"psychology_background"|"university"|"question",answer_type:"boolean"|"number"|"choice",operator:"equals"|"between"|"in",value:string,choices:string[],question:string,source:string}. Boolean value true/false; numeric between value18,35; choice in values pipe separated. String equals case-insensitive. Unique rule ids. Source verbatim evidence. Unsupported/conditional/medical criteria force manual review.
Slot {id,starts_at,capacity,remaining}; create {starts_at,capacity}.
- GET /api/researcher/studies → {studies:Study[],bookings:[{id,study_id,title,participant_name,starts_at}]}. Owned only.
- POST /api/extract {description:string,demo:boolean=false} → Extraction. Pasted source document. demo=true only exact bootstrap sample, labelled fixed fixture.
- POST /api/extract/pdf multipart file → Extraction. Text PDF ≤5MB/20pages. No OCR. Files not retained. Errors + paste fallback.
- Extraction {draft_id,fields:StudyFields,rules:Rule[],manual_review:boolean,review_notes:string[],mode:"live"|"sample",source_text:string}. StudyFields title,summary,description,requirements,mode,location,duration,compensation,tags,convenience_score,convenience_reason. Structured AI researcher document only. Missing/conflicts flag for review; source snippets verified.
- POST /api/studies full Study + {draft_id:number|null,approved:true,slots:CreateSlot[]} → Study. Manual authoring draft_id=null. Approval mandatory. Draft owned, single publish, cannot remove extraction manual-review lock. Human edits suggestions. Non-manual requires future slots; manual may have empty slots.

## Shared topics
Games & Challenges; Puzzles & Memory Games; Virtual Reality; Films, TV & Music; Food & Tasting; Social Games & Interactions; Brain Scans & Neurotech; Movement & Hands-on; Visual & Attention Challenges; Decision-Making & Rewards; Emotions & Relationships; Sleep & Dreams; Language & Words; Technology & Digital Life; Quizzes & Personality; Creativity & Imagination.

## Storage/demo
New ignored backend/studymatch-v2.sqlite3; preserve old prototype DB. Synthetic accounts participant@studymatch.demo and researcher@studymatch.demo, password StudyMatch2026!. Fresh signup works. Hash passwords and session tokens. No recovery, real notifications, medical clearance.
