import json
from datetime import datetime, timedelta, timezone

TOPICS = ["cognition", "language", "decision-making", "social psychology", "neuroscience"]
SAMPLE_DESCRIPTION = "Recruit participants aged 18–35 who are fluent in English, have normal or corrected-to-normal vision, and have not participated in our previous visual search experiment."
SAMPLE_RULES = [
    {"id": "age", "field": "age", "operator": "between", "value": "18,35", "question": "How old are you?", "source": "aged 18–35"},
    {"id": "english", "field": "english", "operator": "equals", "value": "true", "question": "Are you fluent in English?", "source": "fluent in English"},
    {"id": "vision", "field": "vision", "operator": "equals", "value": "true", "question": "Do you have normal or corrected-to-normal vision?", "source": "normal or corrected-to-normal vision"},
    {"id": "previous_visual_search", "field": "question", "operator": "equals", "value": "false", "question": "Have you participated in our previous visual search experiment?", "source": "have not participated in our previous visual search experiment"},
]


def seed(connection):
    if connection.execute("SELECT COUNT(*) FROM participants").fetchone()[0]:
        return
    for name, age, english, vision, interests, mode in [
        ("Alex Morgan", 24, True, True, ["cognition", "decision-making"], "any"),
        ("Sam Taylor", 42, True, True, ["language", "social psychology"], "online"),
        ("Jamie Chen", 21, None, True, ["cognition", "language"], "in_person"),
    ]:
        profile = dict(name=name, age=age, english=english, vision=vision, interests=interests, preferred_mode=mode, max_duration=60, weights=dict(interest=5, compensation=3, convenience=2), notifications=True)
        connection.execute("INSERT INTO participants(data) VALUES (?)", (json.dumps(profile),))
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    examples = [
        ("Attention in a distracted world", "cognition", "in_person", 45, 12, SAMPLE_RULES, False, "Explore how visual distractions affect attention in a short computer task."),
        ("The choices we make", "decision-making", "online", 20, 8, SAMPLE_RULES[:1], False, "Make everyday choices in an interactive decision-making task."),
        ("Words in context", "language", "online", 30, 10, SAMPLE_RULES[1:2], False, "Read short sentences and help us understand how context shapes meaning."),
        ("Social connections", "social psychology", "in_person", 60, 18, [], False, "Explore how people interpret social situations through fictional scenarios."),
        ("Memory across adulthood", "cognition", "online", 40, 15, [dict(SAMPLE_RULES[0], value="40,65", source="aged 40–65")], False, "A memory task for adults aged 40–65."),
        ("Brain imaging orientation", "neuroscience", "in_person", 90, 25, [], True, "Requires investigator-led safety review. No automatic booking is available."),
    ]
    for index, (title, topic, mode, duration, compensation, rules, manual, description) in enumerate(examples):
        study = dict(title=title, topic=topic, mode=mode, duration=duration, compensation=compensation, rules=rules, manual_review=manual, description=description, location="Online" if mode == "online" else "Oxford • Experimental Psychology")
        study_id = connection.execute("INSERT INTO studies(data) VALUES (?)", (json.dumps(study),)).lastrowid
        for offset in (0, 2):
            starts = tomorrow + timedelta(days=(index + offset) % 6, hours=index % 3)
            connection.execute("INSERT INTO slots(study_id, starts_at, capacity) VALUES (?, ?, ?)", (study_id, starts.isoformat(), 3))
