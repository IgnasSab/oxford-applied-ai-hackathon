import json
from datetime import datetime, timedelta, timezone

from .auth import hash_password

LANGUAGES = sorted(set("Arabic Bengali Bulgarian Cantonese Catalan Chinese Croatian Czech Danish Dutch English Estonian Farsi Finnish French German Greek Gujarati Hebrew Hindi Hungarian Indonesian Irish Italian Japanese Korean Latvian Lithuanian Malay Mandarin Marathi Nepali Norwegian Pashto Persian Polish Portuguese Punjabi Romanian Russian Serbian Slovak Spanish Swedish Tamil Telugu Thai Turkish Ukrainian Urdu Vietnamese Welsh Yoruba".split()) | {"American Sign Language", "British Sign Language"})
LANGUAGE_LEVELS = ["Beginner", "Intermediate", "Fluent"]
UNIVERSITIES = ["University of Oxford", "Oxford Brookes University", "University of Cambridge", "University College London", "None"]
LOCATIONS = ["Oxford · Experimental Psychology", "Oxford · Imaging Centre", "Oxford Brookes University", "Cambridge · Department of Psychology", "London · Research Centre"]
PRESCREEN_SECTIONS = [
    {"title": "Additional general information", "fields": [
        {"field": "gender", "label": "Gender", "type": "choice", "options": ["Woman", "Man", "Non-binary", "Self-describe", "Prefer not to say"]},
        {"field": "willing_drugs", "label": "Would you consider taking a drug as part of a study?", "type": "boolean"},
        {"field": "willing_alcohol", "label": "Would you consider drinking alcohol as part of a study?", "type": "boolean"},
        {"field": "willing_brain_scan", "label": "Would you consider a brain scan as part of a study?", "type": "boolean"},
        {"field": "willing_tms", "label": "Would you consider participating in a TMS study?", "type": "boolean"},
        {"field": "parents_deaf", "label": "Are your parents deaf?", "type": "boolean"},
        {"field": "uk_university_student", "label": "Are you currently a UK university student?", "type": "boolean"},
    ]},
    {"title": "Medical and safety information", "fields": [
        {"field": "seizure_history", "label": "Have you had epilepsy, a convulsion or a seizure?", "type": "boolean"},
        {"field": "family_seizures", "label": "Has anyone in your family had seizures?", "type": "boolean"},
        {"field": "fainting_history", "label": "Have you had a fainting spell or syncope?", "type": "boolean"},
        {"field": "concussion_history", "label": "Have you had a concussion or head injury with loss of consciousness?", "type": "boolean"},
        {"field": "hearing_problems", "label": "Do you have hearing problems or ringing in your ears?", "type": "boolean"},
        {"field": "cochlear_implants", "label": "Do you have cochlear implants?", "type": "boolean"},
        {"field": "pregnancy_possible", "label": "Are you pregnant or could you be pregnant?", "type": "boolean"},
        {"field": "metal_in_body", "label": "Do you have metal in your brain, skull or elsewhere in your body?", "type": "boolean"},
        {"field": "implanted_neurostimulator", "label": "Do you have an implanted neurostimulator?", "type": "boolean"},
        {"field": "pacemaker_or_lines", "label": "Do you have a cardiac pacemaker or intracardiac lines?", "type": "boolean"},
        {"field": "infusion_device", "label": "Do you have a medication infusion device?", "type": "boolean"},
        {"field": "medication_use", "label": "Do you take medications or herbal remedies?", "type": "boolean"},
        {"field": "prior_tms", "label": "Have you undergone TMS?", "type": "boolean"},
        {"field": "prior_mri", "label": "Have you undergone MRI?", "type": "boolean"},
        {"field": "neurosurgery_or_eye_surgery", "label": "Have you had neurosurgery or eye surgery?", "type": "boolean"},
        {"field": "antimalarial_treatment", "label": "Are you undergoing anti-malarial treatment?", "type": "boolean"},
        {"field": "metal_injury", "label": "Have you sustained an injury involving metal in your eyes or body?", "type": "boolean"},
    ]},
]
DEMO_PRESCREEN = dict(birth_date="2002-05-14", additional_languages=[], has_laptop=True, has_smartphone=True, has_headphones=True, comfortable_webcam=False, comfortable_audio_recording=False, comfortable_video_recording=False)
TOPICS = ["Games & Challenges", "Puzzles & Memory Games", "Virtual Reality", "Films, TV & Music", "Food & Tasting", "Social Games & Interactions", "Brain Scans & Neurotech", "Movement & Hands-on", "Visual & Attention Challenges", "Decision-Making & Rewards", "Emotions & Relationships", "Sleep & Dreams", "Language & Words", "Technology & Digital Life", "Quizzes & Personality", "Creativity & Imagination"]
SAMPLE_DESCRIPTION = "Attention in a distracted world. Complete a visual attention task on a laboratory computer at Oxford Experimental Psychology. One 45-minute session pays £12. Recruit participants aged 18–35 who are fluent in English, have normal or corrected-to-normal vision, and have not participated in our previous visual search experiment."
SAMPLE_RULES = [
    {"id": "age", "field": "age", "answer_type": "number", "operator": "between", "value": "18,35", "choices": [], "question": "How old are you?", "source": "aged 18–35"},
    {"id": "english", "field": "english", "answer_type": "boolean", "operator": "equals", "value": "true", "choices": [], "question": "Are you fluent in English?", "source": "fluent in English"},
    {"id": "vision", "field": "vision", "answer_type": "boolean", "operator": "equals", "value": "true", "choices": [], "question": "Do you have normal or corrected-to-normal vision?", "source": "normal or corrected-to-normal vision"},
    {"id": "previous_visual_search", "field": "question", "answer_type": "boolean", "operator": "equals", "value": "false", "choices": [], "question": "Have you participated in our previous visual search experiment?", "source": "have not participated in our previous visual search experiment"},
]
SAMPLE_FIELDS = dict(title="Attention in a distracted world", summary="Explore how visual distractions affect attention in a short computer task.", description="Complete a visual attention task on a laboratory computer. You will respond to shapes and patterns on screen during one 45-minute session.", requirements="Recruit participants aged 18–35 who are fluent in English, have normal or corrected-to-normal vision, and have not participated in our previous visual search experiment.", mode="in_person", location="Oxford · Experimental Psychology", duration=45, compensation=12, tags=["Visual & Attention Challenges", "Puzzles & Memory Games"], convenience_score=3, convenience_reason="One 45-minute visit; a lab computer is provided, but travel is required.")


def seed(connection):
    if connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]:
        return
    participant_id = connection.execute("INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)", ("Alex Morgan", "participant@studymatch.demo", hash_password("StudyMatch2026!"), "participant")).lastrowid
    researcher_id = connection.execute("INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)", ("Dr Robin Taylor", "researcher@studymatch.demo", hash_password("StudyMatch2026!"), "researcher")).lastrowid
    profile = dict(DEMO_PRESCREEN, name="Alex Morgan", handedness="right", first_language="English", english=True, vision=True, psychology_background=False, university="University of Oxford", free_response="I enjoy puzzles and finding out how people make decisions.", interests=["Puzzles & Memory Games", "Decision-Making & Rewards", "Visual & Attention Challenges"], preferred_mode="any", preferred_location="", max_duration=480, preferred_times=[], weights=dict(interest=3, compensation=3, convenience=3), notifications="immediate")
    connection.execute("INSERT INTO participants(user_id,data) VALUES (?,?)", (participant_id, json.dumps(profile)))
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    examples = [
        dict(SAMPLE_FIELDS, rules=SAMPLE_RULES, manual_review=False, review_notes=[]),
        dict(title="The choices we make", summary="Trade off risks and rewards in an interactive decision-making game.", description="Make everyday choices in a browser-based decision-making game. Complete one 20-minute session from home using your laptop.", requirements="Adults aged 18–65.", mode="online", location="Online", duration=20, compensation=8, tags=["Decision-Making & Rewards", "Games & Challenges"], convenience_score=5, convenience_reason="A short online session on your own laptop; no travel or setup beyond a browser.", rules=[dict(SAMPLE_RULES[0], value="18,65", source="aged 18–65")], manual_review=False, review_notes=[]),
        dict(title="Words in context", summary="Read short stories and explore how context changes meaning.", description="Read short sentences and stories, then answer questions about their meaning. This online language experiment takes 30 minutes.", requirements="Fluent in English.", mode="online", location="Online", duration=30, compensation=10, tags=["Language & Words", "Creativity & Imagination"], convenience_score=5, convenience_reason="A 30-minute browser task with no special equipment or travel.", rules=SAMPLE_RULES[1:2], manual_review=False, review_notes=[]),
        dict(title="Social connections", summary="Play a cooperative game and explore how people work together.", description="Join a cooperative computer game at our Oxford lab. You will make decisions alongside another participant during one hour-long session.", requirements="Adults aged 18–65.", mode="in_person", location="Oxford · Experimental Psychology", duration=60, compensation=18, tags=["Social Games & Interactions", "Emotions & Relationships", "Games & Challenges"], convenience_score=3, convenience_reason="One hour at the lab; all equipment is supplied but travel and a shared appointment are required.", rules=[dict(SAMPLE_RULES[0], value="18,65", source="aged 18–65")], manual_review=False, review_notes=[]),
        dict(title="Memory across adulthood", summary="Try a collection of memory puzzles from home.", description="Complete a series of word and picture memory challenges in your browser. The study takes around 40 minutes with a short break.", requirements="Adults aged 40–65.", mode="online", location="Online", duration=40, compensation=15, tags=["Puzzles & Memory Games", "Visual & Attention Challenges"], convenience_score=4, convenience_reason="Online with a short break; allow 40 uninterrupted minutes on a laptop.", rules=[dict(SAMPLE_RULES[0], value="40,65", source="aged 40–65")], manual_review=False, review_notes=[]),
        dict(title="Brain imaging orientation", summary="Learn about an upcoming brain imaging research session.", description="This synthetic example illustrates a study needing investigator-led safety review. The research team must confirm suitability before arranging attendance.", requirements="MRI safety screening by investigator required.", mode="in_person", location="Oxford · Imaging Centre", duration=90, compensation=25, tags=["Brain Scans & Neurotech"], convenience_score=1, convenience_reason="A 90-minute specialist appointment with travel, preparation and investigator coordination.", rules=[], manual_review=True, review_notes=["Safety-sensitive study. No automatic booking."]),
    ]
    for index, study in enumerate(examples):
        study_id = connection.execute("INSERT INTO studies(researcher_id,data) VALUES (?,?)", (researcher_id, json.dumps(study))).lastrowid
        if not study["manual_review"]:
            for offset in (0, 2):
                starts = tomorrow + timedelta(days=(index + offset) % 6, hours=index % 3)
                connection.execute("INSERT INTO slots(study_id,starts_at,capacity) VALUES (?,?,?)", (study_id, starts.isoformat(), 3))
