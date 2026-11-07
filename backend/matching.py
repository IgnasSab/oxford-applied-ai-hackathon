from datetime import date


def age_on_date(birth_date, on_date):
    return on_date.year - birth_date.year - ((on_date.month, on_date.day) < (birth_date.month, birth_date.day))


def university_name(value):
    name = " ".join(value.casefold().split())
    return {
        "oxford": "university of oxford", "oxford university": "university of oxford",
        "cambridge": "university of cambridge", "cambridge university": "university of cambridge",
        "ucl": "university college london", "oxford brookes": "oxford brookes university",
    }.get(name, name)


def eligibility(participant, study, answers, review_status=None):
    if study["manual_review"] and review_status != "approved":
        return "manual_review", []
    questions = []
    for rule in study["rules"]:
        if rule["field"] == "age":
            value = age_on_date(date.fromisoformat(participant["birth_date"]), date.today())
        else:
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
            if rule["field"] == "university":
                passes = university_name(value) in {university_name(option) for option in accepted}
            elif rule["field"] == "additional_languages":
                passes = bool({language.strip().casefold() for language in value} & set(accepted))
            else:
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
