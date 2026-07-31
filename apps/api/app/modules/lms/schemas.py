from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class QuizQuestionCreate(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    prompt: str = Field(min_length=2, max_length=500)
    choices: list[str] = Field(min_length=2, max_length=8)
    correct_answer: str = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_answer(self):
        if self.correct_answer not in self.choices:
            raise ValueError("Correct answer must match one of the choices")
        return self


class QuizQuestionRead(BaseModel):
    id: str
    prompt: str
    choices: list[str]


class TrainingModuleCreate(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = None
    content_url: str | None = Field(default=None, max_length=500)
    duration_minutes: int = Field(default=15, ge=1, le=480)
    required_for_roles: list[str] = Field(default_factory=list)
    expires_days: int | None = Field(default=None, ge=1, le=3650)
    quiz_questions: list[QuizQuestionCreate] = Field(default_factory=list, max_length=50)
    passing_score: int = Field(default=80, ge=1, le=100)
    is_active: bool = True

    @model_validator(mode="after")
    def validate_question_ids(self):
        ids = [question.id for question in self.quiz_questions]
        if len(ids) != len(set(ids)):
            raise ValueError("Quiz question IDs must be unique")
        return self


class TrainingModuleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    content_url: str | None = Field(default=None, max_length=500)
    duration_minutes: int | None = Field(default=None, ge=1, le=480)
    required_for_roles: list[str] | None = None
    expires_days: int | None = Field(default=None, ge=1, le=3650)
    quiz_questions: list[QuizQuestionCreate] | None = Field(default=None, max_length=50)
    passing_score: int | None = Field(default=None, ge=1, le=100)
    is_active: bool | None = None


class TrainingModuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None = None
    content_url: str | None = None
    duration_minutes: int
    required_for_roles: list[str] | None = None
    expires_days: int | None = None
    quiz_questions: list[QuizQuestionRead] = Field(default_factory=list)
    passing_score: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TrainingCompletionCreate(BaseModel):
    module_id: UUID
    answers: dict[str, str] = Field(default_factory=dict)


class TrainingCompletionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    module_id: UUID
    completed_at: datetime
    expires_at: datetime | None = None
    score: int | None = None
    passed: bool
    certificate_code: str | None = None
    created_at: datetime


class MyTrainingModuleRead(BaseModel):
    module: TrainingModuleRead
    completed: bool
    completed_at: datetime | None = None
    expires_at: datetime | None = None
    score: int | None = None
    passed: bool | None = None
    certificate_code: str | None = None
    required: bool = True
