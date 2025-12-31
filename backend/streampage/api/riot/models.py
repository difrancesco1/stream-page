from typing import Optional
from pydantic import BaseModel


class AddToIntListRequest(BaseModel):
    summoner_name: str
    tagline: str
    user_reason: str


class ResponseMessage(BaseModel):
    message: str


class RecentMatch(BaseModel):
    champion_id: int
    champion_name: str
    win: bool
    kills: int = 0
    deaths: int = 0
    assists: int = 0


class IntListEntryResponse(BaseModel):
    id: str
    summoner_name: str
    summoner_tag: str
    user_reason: str
    contributor_username: str
    rank_when_added: Optional[str] = None
    current_rank: Optional[str] = None
    recent_matches: list[RecentMatch] = []


class IntListResponse(BaseModel):
    entries: list[IntListEntryResponse]


class IntListContributor(BaseModel):
    user_id: str
    username: str


class IntListContributorsResponse(BaseModel):
    contributors: list[IntListContributor]


class UpdateIntListEntryRequest(BaseModel):
    user_reason: str