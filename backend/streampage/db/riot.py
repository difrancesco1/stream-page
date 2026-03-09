from __future__ import annotations

import logging
import time
import httpx
from datetime import datetime
from typing import Optional
from urllib.parse import quote

from sqlalchemy.orm import Session

from streampage.config import RIOT_API_KEY
from streampage.db.models import IntListEntry, OpggEntry, SummonerData

logger = logging.getLogger(__name__)

RIOT_ACCOUNT_API_BASE = "https://americas.api.riotgames.com"
RIOT_NA_API_BASE = "https://na1.api.riotgames.com"
RIOT_AUTH_HEADERS = {"X-Riot-Token": RIOT_API_KEY}

RATE_LIMIT_DELAY = 1.3  # seconds between match detail requests


def _riot_get(client: httpx.Client, url: str, **kwargs) -> httpx.Response:
    """GET with automatic retry on 429 rate limits."""
    max_retries = 3
    for attempt in range(max_retries):
        response = client.get(url, headers=RIOT_AUTH_HEADERS, **kwargs)
        if response.status_code != 429:
            return response
        retry_after = int(response.headers.get("Retry-After", "5"))
        logger.info("Rate limited, waiting %ds (attempt %d/%d)", retry_after, attempt + 1, max_retries)
        time.sleep(retry_after)
    return response


def get_puuid(game_name: str, tag_line: str) -> str:
    """Get PUUID from Riot ID (game_name#tag_line)."""
    encoded_name = quote(game_name)
    url = f"{RIOT_ACCOUNT_API_BASE}/riot/account/v1/accounts/by-riot-id/{encoded_name}/{tag_line}"
    
    with httpx.Client() as client:
        response = client.get(url, headers=RIOT_AUTH_HEADERS)
        response.raise_for_status()
        data = response.json()
        return data["puuid"]


def get_rank_by_puuid(puuid: str) -> Optional[str]:
    """Get ranked solo/duo rank for a player by PUUID. Returns formatted rank string like 'DIAMOND IV 25LP'."""
    url = f"{RIOT_NA_API_BASE}/lol/league/v4/entries/by-puuid/{puuid}"
    
    with httpx.Client() as client:
        response = client.get(url, headers=RIOT_AUTH_HEADERS)
        if response.status_code != 200:
            return None
        data = response.json()
        
        # Find solo/duo queue entry
        for entry in data:
            if entry.get("queueType") == "RANKED_SOLO_5x5":
                tier = entry.get("tier", "UNRANKED")
                rank = entry.get("rank", "")
                lp = entry.get("leaguePoints", 0)
                return f"{tier} {rank} {lp}LP"
        
        return "UNRANKED"


def get_last_10_match_ids(puuid: str) -> list[str]:
    """Get the last 10 ranked match IDs for a player."""
    url = f"{RIOT_ACCOUNT_API_BASE}/lol/match/v5/matches/by-puuid/{puuid}/ids"
    
    with httpx.Client() as client:
        response = client.get(
            url, 
            headers=RIOT_AUTH_HEADERS,
            params={
                "type": "ranked",
                "count": 10,
            },
        )
        if response.status_code != 200:
            return []
        return response.json()


def get_match_details(match_id: str, puuid: str) -> Optional[dict]:
    """Get champion ID, win/loss, and KDA for a specific match and player.
    
    Returns: {"match_id": str, "champion_id": int, "champion_name": str, "win": bool, "kills": int, "deaths": int, "assists": int} or None
    """
    url = f"{RIOT_ACCOUNT_API_BASE}/lol/match/v5/matches/{match_id}"
    
    with httpx.Client() as client:
        response = client.get(url, headers=RIOT_AUTH_HEADERS)
        if response.status_code != 200:
            return None
        data = response.json()
        
        # Find the participant matching the puuid
        participants = data.get("info", {}).get("participants", [])
        for participant in participants:
            if participant.get("puuid") == puuid:
                return {
                    "match_id": match_id,
                    "champion_id": participant.get("championId"),
                    "champion_name": participant.get("championName"),
                    "win": participant.get("win", False),
                    "kills": participant.get("kills", 0),
                    "deaths": participant.get("deaths", 0),
                    "assists": participant.get("assists", 0),
                }
        
        return None


def get_recent_matches(puuid: str) -> list[dict]:
    """Get details for the last 10 matches.
    
    Returns: list of {"match_id": str, "champion_id": int, "champion_name": str, "win": bool, "kills": int, "deaths": int, "assists": int}
    """
    match_ids = get_last_10_match_ids(puuid)
    matches = []
    
    for match_id in match_ids:
        details = get_match_details(match_id, puuid)
        if details:
            matches.append(details)
    
    return matches


def get_ranked_data_by_puuid(puuid: str) -> Optional[dict]:
    """Get full ranked solo/duo data for a player by PUUID.
    
    Returns: {"tier": str, "rank": str, "league_points": int, "wins": int, "losses": int} or None
    """
    url = f"{RIOT_NA_API_BASE}/lol/league/v4/entries/by-puuid/{puuid}"
    
    with httpx.Client() as client:
        response = client.get(url, headers=RIOT_AUTH_HEADERS)
        if response.status_code != 200:
            return None
        data = response.json()
        
        # Find solo/duo queue entry
        for entry in data:
            if entry.get("queueType") == "RANKED_SOLO_5x5":
                return {
                    "tier": entry.get("tier"),
                    "rank": entry.get("rank"),
                    "league_points": entry.get("leaguePoints", 0),
                    "wins": entry.get("wins", 0),
                    "losses": entry.get("losses", 0),
                }
        
        return None


def _migrate_puuid(session: Session, old_puuid: str, new_puuid: str) -> None:
    """Update all DB references when a PUUID changes."""
    logger.info(f"Migrating PUUID: {old_puuid[:12]}... -> {new_puuid[:12]}...")

    session.query(IntListEntry).filter(
        IntListEntry.puuid == old_puuid
    ).update({"puuid": new_puuid})

    session.query(OpggEntry).filter(
        OpggEntry.puuid == old_puuid
    ).update({"puuid": new_puuid})

    old_data = session.query(SummonerData).filter(
        SummonerData.puuid == old_puuid
    ).first()
    if old_data:
        session.delete(old_data)
        session.flush()


def fetch_and_store_summoner_data(
    session: Session,
    puuid: str,
    game_name: str,
    tag_line: str,
) -> SummonerData:
    """Fetch data from Riot API and store it in the database.
    
    Re-resolves the PUUID from the Riot ID to handle cases where the
    stored PUUID becomes invalid (e.g. API key project change).
    
    Returns the created/updated SummonerData object.
    """
    fresh_puuid = get_puuid(game_name, tag_line)

    if fresh_puuid != puuid:
        _migrate_puuid(session, puuid, fresh_puuid)

    active_puuid = fresh_puuid

    ranked_data = get_ranked_data_by_puuid(active_puuid)
    recent_matches = get_recent_matches(active_puuid)

    existing = session.query(SummonerData).filter(
        SummonerData.puuid == active_puuid
    ).first()

    if existing:
        existing.game_name = game_name
        existing.tag_line = tag_line
        existing.tier = ranked_data.get("tier") if ranked_data else None
        existing.rank = ranked_data.get("rank") if ranked_data else None
        existing.league_points = ranked_data.get("league_points") if ranked_data else None
        existing.wins = ranked_data.get("wins") if ranked_data else None
        existing.losses = ranked_data.get("losses") if ranked_data else None
        existing.recent_matches = recent_matches
        existing.last_updated = datetime.utcnow()
        return existing
    else:
        summoner_data = SummonerData(
            puuid=active_puuid,
            game_name=game_name,
            tag_line=tag_line,
            tier=ranked_data.get("tier") if ranked_data else None,
            rank=ranked_data.get("rank") if ranked_data else None,
            league_points=ranked_data.get("league_points") if ranked_data else None,
            wins=ranked_data.get("wins") if ranked_data else None,
            losses=ranked_data.get("losses") if ranked_data else None,
            recent_matches=recent_matches,
            last_updated=datetime.utcnow(),
        )
        session.add(summoner_data)
        return summoner_data


SEASON_START = int(datetime(2026, 1, 8).timestamp())


def get_all_ranked_match_ids(puuid: str, known_ids: set[str] | None = None, max_matches: int = 500) -> list[str]:
    """Paginate through ranked solo/duo match IDs for the current season.

    Stops when the API returns empty, all returned IDs are already known,
    or max_matches is reached.
    """
    if known_ids is None:
        known_ids = set()

    all_ids: list[str] = []
    start = 0
    page_size = 100

    with httpx.Client() as client:
        while len(all_ids) < max_matches:
            url = f"{RIOT_ACCOUNT_API_BASE}/lol/match/v5/matches/by-puuid/{puuid}/ids"
            response = _riot_get(
                client, url,
                params={
                    "queue": 420,
                    "startTime": SEASON_START,
                    "start": start,
                    "count": page_size,
                },
            )
            if response.status_code != 200:
                break
            batch = response.json()
            if not batch:
                break

            new_ids = [mid for mid in batch if mid not in known_ids]
            all_ids.extend(new_ids)

            if len(new_ids) == 0:
                break
            start += page_size

    return all_ids[:max_matches]


def get_match_teammates(
    match_id: str, owner_puuid: str
) -> Optional[tuple[bool, list[str], datetime]]:
    """Fetch a match and extract the owner's win status and teammate names.

    Returns (win, ["name#tag", ...], played_at) or None on failure.
    Teammates are the 4 other players on the owner's team, stored as
    lowercase "gamename#tag" for case-insensitive matching.
    """
    url = f"{RIOT_ACCOUNT_API_BASE}/lol/match/v5/matches/{match_id}"
    with httpx.Client() as client:
        response = _riot_get(client, url)
        if response.status_code != 200:
            return None
        data = response.json()

    info = data.get("info", {})
    participants = info.get("participants", [])

    owner_team_id = None
    owner_win = False
    for p in participants:
        if p.get("puuid") == owner_puuid:
            owner_team_id = p.get("teamId")
            owner_win = p.get("win", False)
            break

    if owner_team_id is None:
        return None

    teammates: list[str] = []
    for p in participants:
        if p.get("teamId") == owner_team_id and p.get("puuid") != owner_puuid:
            game_name = p.get("riotIdGameName", "")
            tag_line = p.get("riotIdTagline", "")
            if game_name and tag_line:
                teammates.append(f"{game_name}#{tag_line}".lower())

    game_creation_ms = info.get("gameCreation", 0)
    played_at = datetime.utcfromtimestamp(game_creation_ms / 1000) if game_creation_ms else datetime.utcnow()

    return (owner_win, teammates, played_at)