from datetime import datetime

from pydantic import BaseModel


class RecordFirstRequest(BaseModel):
    name: str


class UpdateFirstRequest(BaseModel):
    name: str | None = None
    first_count: int | None = None


class FirstEntryResponse(BaseModel):
    id: str
    name: str
    first_count: int
    created_at: datetime


class FirstListResponse(BaseModel):
    entries: list[FirstEntryResponse]
    since: str | None = None


class ResponseMessage(BaseModel):
    message: str
