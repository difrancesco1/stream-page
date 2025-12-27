from typing import Optional
from pydantic import BaseModel


class AddOpggAccountRequest(BaseModel):
    summoner_name: str
    tagline: str


class RemoveOpggAccountRequest(BaseModel):
    account_id: str


class SortOpggAccountsRequest(BaseModel):
    """List of account IDs in the desired order."""
    account_ids: list[str]


class RemoveOpggGameRequest(BaseModel):
    puuid: str
    match_index: int


class ResponseMessage(BaseModel):
    message: str


class RecentMatch(BaseModel):
    champion_id: int
    champion_name: str
    win: bool
    kills: int = 0
    deaths: int = 0
    assists: int = 0


class OpggAccountResponse(BaseModel):
    id: str
    puuid: str
    display_order: int
    game_name: str
    tag_line: str
    tier: Optional[str] = None
    rank: Optional[str] = None
    league_points: Optional[int] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    recent_matches: list[RecentMatch] = []


class OpggAccountsResponse(BaseModel):
    accounts: list[OpggAccountResponse]

