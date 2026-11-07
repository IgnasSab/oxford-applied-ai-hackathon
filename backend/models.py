from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, StrictBool, model_validator


class Weights(BaseModel):
    interest: float = Field(default=5, ge=0, le=10)
    compensation: float = Field(default=3, ge=0, le=10)
    convenience: float = Field(default=2, ge=0, le=10)

    @model_validator(mode="after")
    def positive_total(self):
        if sum(self.model_dump().values()) == 0:
            raise ValueError("Choose at least one preference priority.")
        return self


class ParticipantInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    age: int = Field(ge=18, le=120)
    english: Optional[StrictBool] = None
    vision: Optional[StrictBool] = None
    interests: List[str] = Field(max_length=5)
    preferred_mode: Literal["online", "in_person", "any"] = "any"
    max_duration: int = Field(default=60, ge=5, le=240)
    weights: Weights = Field(default_factory=Weights)
    notifications: bool = False


class Rule(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    field: Literal["age", "english", "vision", "question"]
    operator: Literal["between", "equals"]
    value: str
    question: str = Field(min_length=1, max_length=500)
    source: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def valid_operation(self):
        if self.field == "age":
            bounds = self.value.split(",")
            if self.operator != "between" or len(bounds) != 2:
                raise ValueError("Age rules require between with value such as 18,35.")
            low, high = map(int, bounds)
            if not 0 <= low <= high <= 120:
                raise ValueError("Invalid age range.")
        elif self.operator != "equals" or self.value not in ("true", "false"):
            raise ValueError("Boolean rules require equals with true or false.")
        return self


class Extraction(BaseModel):
    rules: List[Rule] = Field(max_length=20)
    manual_review: bool
    review_notes: List[str]


class ExtractInput(BaseModel):
    description: str = Field(min_length=10, max_length=8000)
    demo: bool = False


class SlotInput(BaseModel):
    starts_at: datetime
    capacity: int = Field(ge=1, le=100)

    @model_validator(mode="after")
    def future_slot(self):
        if self.starts_at.tzinfo is None:
            raise ValueError("Session time must include a timezone.")
        if self.starts_at <= datetime.now(timezone.utc):
            raise ValueError("Session must be in the future.")
        return self


class StudyInput(BaseModel):
    draft_id: int
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=10, max_length=8000)
    topic: str
    mode: Literal["online", "in_person"]
    location: str = Field(min_length=1, max_length=150)
    duration: int = Field(ge=5, le=240)
    compensation: float = Field(ge=0, le=1000)
    rules: List[Rule] = Field(max_length=20)
    manual_review: bool
    approved: Literal[True]
    slots: List[SlotInput] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def unique_rules(self):
        if len({rule.id for rule in self.rules}) != len(self.rules):
            raise ValueError("Screening rule ids must be unique.")
        return self


class AnswersInput(BaseModel):
    study_id: int
    answers: Dict[str, StrictBool]


class BookingInput(BaseModel):
    participant_id: int
    slot_id: int
