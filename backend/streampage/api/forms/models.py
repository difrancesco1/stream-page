from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel

from streampage.db.enums import QuestionType


# --- Generic ---

class ResponseMessage(BaseModel):
    message: str


# --- Question schemas ---

class QuestionCreate(BaseModel):
    question_text: str
    question_type: QuestionType
    options: Optional[dict] = None
    is_required: bool = False
    display_order: int = 0


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[QuestionType] = None
    options: Optional[dict] = None
    is_required: Optional[bool] = None
    display_order: Optional[int] = None


class QuestionResponse(BaseModel):
    id: str
    question_text: str
    question_type: str
    options: Optional[dict] = None
    is_required: bool
    display_order: int


class ReorderQuestionsRequest(BaseModel):
    question_ids: list[str]


# --- Form schemas ---

class FormCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_open: bool = True
    email_notifications_enabled: bool = False
    questions: list[QuestionCreate] = []


class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_open: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None


class FormSummaryResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    is_open: bool
    email_notifications_enabled: bool
    response_count: int
    created_at: datetime
    updated_at: datetime


class FormDetailResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    is_open: bool
    email_notifications_enabled: bool
    questions: list[QuestionResponse]
    response_count: int
    created_at: datetime
    updated_at: datetime


class FormListResponse(BaseModel):
    forms: list[FormSummaryResponse]


# --- Answer / Response schemas ---

class AnswerSubmit(BaseModel):
    question_id: str
    answer_value: Any = None


class FormResponseSubmit(BaseModel):
    answers: list[AnswerSubmit]


class AnswerResponse(BaseModel):
    question_id: str
    question_text: str
    question_type: str
    answer_value: Any = None


class SingleResponseDetail(BaseModel):
    id: str
    respondent_username: str
    submitted_at: datetime
    answers: list[AnswerResponse]


class FormResponsesListResponse(BaseModel):
    form_id: str
    form_title: str
    responses: list[SingleResponseDetail]
