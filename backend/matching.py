from datetime import date
import json

from .seed import LANGUAGE_LEVELS


def age_on_date(birth_date, on_date):
    return on_date.year - birth_date.year - ((on_date.month, on_date.day) < (birth_date.month, birth_date.day))


def university_name(value):
    name = " ".join(value.casefold().split())
    return {
        "oxford": "university of oxford", "oxford university": "university of oxford",
        "cambridge": "university of cambridge", "cambridge university": "university of cambridge",
        "ucl": "university college london", "oxford brookes": "oxford brookes university",
    }.get(name, name)


def screening_checks(participant, study, answers):
    checks = []
    for rule in study["rules"]:
        answer_source = "profile"
        if rule["field"] == "age":
            value = age_on_date(date.fromisoformat(participant["birth_date"]), date.today()) if participant["birth_date"] else None
        elif rule["field"] == "language_levels":
            target = json.loads(rule["value"])
            language = target["language"].casefold()
            if participant["first_language"].casefold() == language:
                value = "Fluent"
            else:
                value = next((level for name, level in participant.get("language_levels", {}).items() if name.casefold() == language), None)
                if value is None and any(name.casefold() == language for name in participant["additional_languages"]):
                    value = "Fluent"
                if value is None:
                    value = answers.get(rule["id"])
                    answer_source = "study"
        else:
            value = participant.get(rule["field"]) if rule["field"] != "question" else None
            if rule["field"] == "gender" and value in ("Self-describe", "Prefer not to say"):
                value = None
            if value is None:
                value = answers.get(rule["id"])
                answer_source = "study"
            if rule["field"] == "gender" and value in ("Self-describe", "Prefer not to say"):
                value = None
        if rule["field"] == "language_levels":
            expected_answer = f"{target['level']} or higher in {target['language']}"
        elif rule["answer_type"] == "boolean":
            expected_answer = "Yes" if rule["value"] == "true" else "No"
        elif rule["operator"] == "between":
            expected_answer = "–".join(rule["value"].split(","))
        else:
            expected_answer = " or ".join(rule["value"].split("|"))
        check = {key: rule[key] for key in ("id", "question", "answer_type", "choices", "source")}
        check.update(answer=value, answer_source=answer_source if value is not None else None, expected_answer=expected_answer)
        checks.append(check)
        if value is None:
            check["status"] = "missing"
            continue
        if rule["field"] == "language_levels":
            passes = value in LANGUAGE_LEVELS and LANGUAGE_LEVELS.index(value) >= LANGUAGE_LEVELS.index(target["level"])
        elif rule["answer_type"] == "number":
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
        check["status"] = "met" if passes else "not_met"
    return checks


def eligibility(participant, study, answers, review_status=None):
    checks = screening_checks(participant, study, answers)
    if any(check["status"] == "not_met" for check in checks):
        return "ineligible", []
    if study["manual_review"] and review_status != "approved":
        return "manual_review", []
    questions = [{key: check[key] for key in ("id", "question", "answer_type", "choices")} for check in checks if check["status"] == "missing"]
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
