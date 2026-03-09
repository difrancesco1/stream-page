from datetime import datetime

from pydantic import BaseModel


class RecordDuoRequest(BaseModel):
    name: str


class UpdateDuoRequest(BaseModel):
    name: str | None = None
    note: str | None = None


class AddAccountRequest(BaseModel):
    summoner_name: str


class SetAccountRequest(BaseModel):
    game_name: str
    tag_line: str


class DuoEntryAccountResponse(BaseModel):
    id: str
    summoner_name: str


class DuoEntryResponse(BaseModel):
    id: str
    name: str
    wins: int
    losses: int
    games_played: int
    result: str
    note: str
    accounts: list[DuoEntryAccountResponse]
    created_at: datetime


class DuoListResponse(BaseModel):
    entries: list[DuoEntryResponse]
    since: str | None = None


class TrackedAccountResponse(BaseModel):
    game_name: str
    tag_line: str
    last_updated: datetime | None = None
    match_count: int = 0


class ResponseMessage(BaseModel):
    message: str
