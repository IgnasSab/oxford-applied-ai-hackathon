def eligibility(participant, study, answers):
    if study["manual_review"]:
        return "manual_review", []
    questions = []
    for rule in study["rules"]:
        value = answers.get(rule["id"]) if rule["field"] == "question" else participant[rule["field"]]
        if value is None:
            questions.append({"id": rule["id"], "question": rule["question"]})
            continue
        if rule["field"] == "age":
            low, high = map(int, rule["value"].split(","))
            passes = low <= value <= high
        else:
            passes = value == (rule["value"] == "true")
        if not passes:
            return "ineligible", []
    return ("needs_screening" if questions else "eligible"), questions


def relevance(participant, study):
    interest = float(study["topic"] in participant["interests"])
    hourly = study["compensation"] * 60 / study["duration"]
    compensation = min(hourly / 25, 1)
    mode_matches = participant["preferred_mode"] in ("any", study["mode"])
    duration_matches = study["duration"] <= participant["max_duration"]
    convenience = (int(mode_matches) + int(duration_matches)) / 2
    weights = participant["weights"]
    score = 100 * (weights["interest"] * interest + weights["compensation"] * compensation + weights["convenience"] * convenience) / sum(weights.values())
    reasons = []
    if interest:
        reasons.append("Matches your interest in " + study["topic"])
    if mode_matches and participant["preferred_mode"] != "any":
        reasons.append("Your preferred study format")
    if duration_matches:
        reasons.append("Within your preferred duration")
    reasons.append(f"£{hourly:.0f}/hour equivalent")
    return round(score), reasons
