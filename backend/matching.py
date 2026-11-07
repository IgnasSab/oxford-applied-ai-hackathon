def eligibility(participant, study, answers):
    if study["manual_review"]:
        return "manual_review", []
    questions = []
    for rule in study["rules"]:
        value = answers.get(rule["id"]) if rule["field"] == "question" else participant[rule["field"]]
        if value is None:
            questions.append({key: rule[key] for key in ("id", "question", "answer_type", "choices")})
            continue
        if rule["answer_type"] == "number":
            bounds = [float(bound) for bound in rule["value"].split(",")]
            passes = bounds[0] <= value <= bounds[1] if rule["operator"] == "between" else value == bounds[0]
        elif rule["answer_type"] == "boolean":
            passes = value == (rule["value"] == "true")
        else:
            accepted = rule["value"].casefold().split("|") if rule["operator"] == "in" else [rule["value"].casefold()]
            passes = value.strip().casefold() in accepted
        if not passes:
            return "ineligible", []
    return ("needs_screening" if questions else "eligible"), questions


def relevance(participant, study):
    overlap = set(participant["interests"]) & set(study["tags"])
    interest = 1 + 4 * len(overlap) / len(set(participant["interests"])) if participant["interests"] else 1
    hourly = study["compensation"] * 60 / study["duration"]
    components = {"interest": interest, "compensation": 1 + 4 * min(hourly / 25, 1), "convenience": study["convenience_score"]}
    weights = participant["weights"]
    score = sum(weights[key] * value for key, value in components.items()) / sum(weights.values())
    reasons = ["Matches " + ", ".join(sorted(overlap))] if overlap else ["No selected interest tags overlap"]
    reasons.extend([f"£{hourly:.2f}/hour equivalent", study["convenience_reason"]])
    return round(score, 1), components, reasons
