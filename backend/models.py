from datetime import date, datetime, timezone
import json
import math
import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictFloat, StrictInt, StringConstraints, field_validator, model_validator

from .matching import age_on_date
from .seed import LANGUAGE_LEVELS, PRESCREEN_SECTIONS


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LoginInput(InputModel):
    email: str = Field(min_length=3, max_length=254)
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address.")
        return value.lower()


class SignupInput(LoginInput):
    name: str = Field(min_length=1, max_length=80)
    role: Literal["participant", "researcher"]


class Weights(InputModel):
    interest: float = Field(default=3, ge=1, le=5, allow_inf_nan=False)
    compensation: float = Field(default=3, ge=1, le=5, allow_inf_nan=False)
    convenience: float = Field(default=3, ge=1, le=5, allow_inf_nan=False)


class PreferencesInput(InputModel):
    interests: list[str] = Field(default_factory=list, max_length=16)
    preferred_mode: Literal["online", "in_person", "any"] = "any"
    preferred_location: str = Field(default="", max_length=150)
    max_duration: int = Field(default=480, ge=5, le=480)
    preferred_times: list[Literal["morning", "afternoon", "evening"]] = Field(default_factory=list)
    notifications: Literal["off", "immediate", "weekly"] = "off"
    weights: Weights = Field(default_factory=Weights)
    preference_filters: StrictBool = False


class ParticipantInput(PreferencesInput):
    name: str = Field(min_length=1, max_length=80)
    birth_date: date
    handedness: Literal["left", "right", "ambidextrous"]
    first_language: str = Field(min_length=1, max_length=80)
    additional_languages: list[str] = Field(default_factory=list, max_length=20)
    language_levels: dict[str, Literal["Beginner", "Intermediate", "Fluent"]] = Field(default_factory=dict, max_length=20)
    english: StrictBool
    vision: StrictBool
    psychology_background: StrictBool
    university: str = Field(min_length=1, max_length=150)
    has_laptop: StrictBool
    has_smartphone: StrictBool
    has_headphones: StrictBool
    comfortable_webcam: StrictBool
    comfortable_audio_recording: StrictBool
    comfortable_video_recording: StrictBool
    free_response: str = Field(default="", max_length=1000)
    gender: Literal["Woman", "Man", "Non-binary", "Self-describe", "Prefer not to say"] | None = None
    willing_drugs: StrictBool | None = None
    willing_alcohol: StrictBool | None = None
    willing_brain_scan: StrictBool | None = None
    willing_tms: StrictBool | None = None
    parents_deaf: StrictBool | None = None
    uk_university_student: StrictBool | None = None
    seizure_history: StrictBool | None = None
    family_seizures: StrictBool | None = None
    fainting_history: StrictBool | None = None
    concussion_history: StrictBool | None = None
    hearing_problems: StrictBool | None = None
    cochlear_implants: StrictBool | None = None
    pregnancy_possible: StrictBool | None = None
    metal_in_body: StrictBool | None = None
    implanted_neurostimulator: StrictBool | None = None
    pacemaker_or_lines: StrictBool | None = None
    infusion_device: StrictBool | None = None
    medication_use: StrictBool | None = None
    prior_tms: StrictBool | None = None
    prior_mri: StrictBool | None = None
    neurosurgery_or_eye_surgery: StrictBool | None = None
    antimalarial_treatment: StrictBool | None = None
    metal_injury: StrictBool | None = None

    @field_validator("birth_date")
    @classmethod
    def adult_birth_date(cls, value):
        if not 18 <= age_on_date(value, date.today()) <= 120:
            raise ValueError("Participants must be aged 18–120.")
        return value

    @field_validator("additional_languages")
    @classmethod
    def valid_languages(cls, values):
        if any(not value.strip() or len(value) > 80 for value in values):
            raise ValueError("Enter a language name of 1–80 characters.")
        return list(dict.fromkeys(value.strip() for value in values))

    @field_validator("language_levels")
    @classmethod
    def valid_language_levels(cls, values):
        if any(not language.strip() or len(language) > 80 for language in values):
            raise ValueError("Enter a language name of 1–80 characters.")
        normalized = {language.strip(): level for language, level in values.items()}
        if len({language.casefold() for language in normalized}) != len(normalized):
            raise ValueError("Each language can have only one proficiency level.")
        return normalized

    @model_validator(mode="after")
    def fluent_languages(self):
        if "language_levels" not in self.model_fields_set:
            self.language_levels = {language: "Fluent" for language in self.additional_languages}
        self.additional_languages = [language for language, level in self.language_levels.items() if level == "Fluent"]
        return self


class Rule(InputModel):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    field: Literal["age", "handedness", "first_language", "english", "vision", "psychology_background", "university", "additional_languages", "language_levels", "gender", "willing_drugs", "willing_alcohol", "willing_brain_scan", "willing_tms", "parents_deaf", "uk_university_student", "has_laptop", "has_smartphone", "has_headphones", "comfortable_webcam", "comfortable_audio_recording", "comfortable_video_recording", "question"]
    answer_type: Literal["boolean", "number", "choice"]
    operator: Literal["between", "equals", "in", "language_at_least"]
    value: str = Field(min_length=1, max_length=1000)
    choices: list[str] = Field(max_length=30)
    question: str = Field(min_length=1, max_length=500)
    source: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def valid_operation(self):
        canonical_types = {"age": "number", "english": "boolean", "vision": "boolean", "psychology_background": "boolean", "handedness": "choice", "first_language": "choice", "university": "choice", "additional_languages": "choice", "language_levels": "choice", "gender": "choice", "willing_drugs": "boolean", "willing_alcohol": "boolean", "willing_brain_scan": "boolean", "willing_tms": "boolean", "parents_deaf": "boolean", "uk_university_student": "boolean", "has_laptop": "boolean", "has_smartphone": "boolean", "has_headphones": "boolean", "comfortable_webcam": "boolean", "comfortable_audio_recording": "boolean", "comfortable_video_recording": "boolean"}
        if self.field in canonical_types and self.answer_type != canonical_types[self.field]:
            raise ValueError("Answer type must match the selected profile field.")
        if self.field == "gender":
            self.choices = PRESCREEN_SECTIONS[0]["fields"][0]["options"]
        if self.field == "language_levels" or self.operator == "language_at_least":
            if self.field != "language_levels" or self.operator != "language_at_least":
                raise ValueError("Language proficiency uses language_levels with language_at_least.")
            target = json.loads(self.value)
            if not isinstance(target, dict) or set(target) != {"language", "level"} or not isinstance(target["language"], str) or not target["language"].strip() or target["level"] not in LANGUAGE_LEVELS:
                raise ValueError('Language target requires {"language":"French","level":"Intermediate"}.')
            if self.choices != ["None", *LANGUAGE_LEVELS]:
                raise ValueError("Language questions require None, Beginner, Intermediate and Fluent choices.")
        elif self.answer_type == "boolean":
            if self.operator != "equals" or self.value not in ("true", "false"):
                raise ValueError("Boolean rules require equals with true or false.")
        elif self.answer_type == "number":
            parts = self.value.split(",")
            if self.operator not in ("equals", "between") or len(parts) != (2 if self.operator == "between" else 1):
                raise ValueError("Number rules require equals or between, for example 18,35.")
            bounds = [float(value) for value in parts]
            if not all(math.isfinite(value) for value in bounds) or (len(bounds) == 2 and bounds[0] > bounds[1]):
                raise ValueError("Invalid number range.")
        else:
            if self.operator not in ("equals", "in"):
                raise ValueError("Choice rules require equals or in.")
            if self.field == "question" and (len(self.choices) < 2 or not set(self.value.casefold().split("|")).issubset({choice.casefold() for choice in self.choices})):
                raise ValueError("Choice questions need at least two options including every accepted answer.")
            if self.field == "gender" and not set(self.value.casefold().split("|")).issubset({"woman", "man", "non-binary"}):
                raise ValueError("Gender criteria must name explicit gender identities, not withheld or unspecified answers.")
        return self


class StudyFields(InputModel):
    title: str = Field(min_length=1, max_length=160)
    summary: str = Field(min_length=1, max_length=400)
    description: str = Field(min_length=10, max_length=20000)
    requirements: str = Field(max_length=20000)
    mode: Literal["online", "in_person"]
    location: str = Field(min_length=1, max_length=200)
    duration: int = Field(ge=5, le=480)
    compensation: float = Field(ge=0, le=10000, allow_inf_nan=False)
    tags: list[str] = Field(max_length=16)
    convenience_score: float = Field(ge=1, le=5, allow_inf_nan=False)
    convenience_reason: str = Field(min_length=1, max_length=1000)


class Extraction(InputModel):
    fields: StudyFields
    rules: list[Rule] = Field(max_length=30)
    manual_review: bool
    review_notes: list[str] = Field(max_length=30)


class ExtractInput(InputModel):
    description: str = Field(min_length=10, max_length=50000)
    demo: bool = False


class SlotInput(InputModel):
    starts_at: datetime
    capacity: int = Field(ge=1, le=100)

    @model_validator(mode="after")
    def future_slot(self):
        if self.starts_at.tzinfo is None:
            raise ValueError("Session time must include a timezone.")
        if self.starts_at <= datetime.now(timezone.utc):
            raise ValueError("Session must be in the future.")
        return self


class StudyPrepareInput(InputModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=10, max_length=20000)
    mode: Literal["online", "in_person"]
    location: str = Field(default="", max_length=200)
    duration: int = Field(ge=5, le=480)
    compensation: float = Field(ge=0, le=10000, allow_inf_nan=False)
    tags: list[str] = Field(min_length=1, max_length=16)

    @model_validator(mode="after")
    def required_location(self):
        if self.mode == "online":
            self.location = "Online"
        elif not self.location or self.location.casefold() == "online":
            raise ValueError("Choose a location for an in-person study.")
        return self


class SlotsInput(InputModel):
    slots: list[SlotInput] = Field(max_length=30)

    @model_validator(mode="after")
    def unique_times(self):
        if len({slot.starts_at for slot in self.slots}) != len(self.slots):
            raise ValueError("Session times must be distinct.")
        return self


class StudyInput(SlotsInput):
    draft_id: int
    approved: Literal[True]


class ReviewRequestInput(InputModel):
    study_id: int
    note: str = Field(default="", max_length=1000)


class ReviewDecisionInput(InputModel):
    decision: Literal["approved", "declined"]
    note: str = Field(default="", max_length=1000)
    eligibility_checked: StrictBool

    @model_validator(mode="after")
    def confirmed_checks(self):
        if self.decision == "approved" and not self.eligibility_checked:
            raise ValueError("Confirm that the required eligibility and safety checks were completed before approving.")
        return self


class AnswersInput(InputModel):
    study_id: int
    answers: dict[str, StrictBool | StrictInt | StrictFloat | str] = Field(min_length=1, max_length=30)


class BookingInput(InputModel):
    slot_id: int
