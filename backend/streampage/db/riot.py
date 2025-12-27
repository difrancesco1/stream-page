import httpx
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import quote

from sqlalchemy.orm import Session

from streampage.config import RIOT_API_KEY


RIOT_ACCOUNT_API_BASE = "https://americas.api.riotgames.com"
RIOT_NA_API_BASE = "https://na1.api.riotgames.com"

# Cache duration - how long before we refresh data from Riot API
CACHE_DURATION_MINUTES = 30


def get_puuid(game_name: str, tag_line: str) -> str:
    """Get PUUID from Riot ID (game_name#tag_line)."""
    encoded_name = quote(game_name)
    url = f"{RIOT_ACCOUNT_API_BASE}/riot/account/v1/accounts/by-riot-id/{encoded_name}/{tag_line}"
    
    with httpx.Client() as client:
        response = client.get(url, params={"api_key": RIOT_API_KEY})
        response.raise_for_status()
        data = response.json()
        return data["puuid"]


def get_rank_by_puuid(puuid: str) -> Optional[str]:
    """Get ranked solo/duo rank for a player by PUUID. Returns formatted rank string like 'DIAMOND IV 25LP'."""
    url = f"{RIOT_NA_API_BASE}/lol/league/v4/entries/by-puuid/{puuid}"
    
    with httpx.Client() as client:
        response = client.get(url, params={"api_key": RIOT_API_KEY})
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
            params={
                "api_key": RIOT_API_KEY,
                "type": "ranked",
                "count": 10
            }
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
        response = client.get(url, params={"api_key": RIOT_API_KEY})
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
        response = client.get(url, params={"api_key": RIOT_API_KEY})
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


def fetch_and_cache_summoner_data(
    session: Session,
    puuid: str,
    game_name: str,
    tag_line: str,
) -> "SummonerData":
    """Fetch fresh data from Riot API and cache it in the database.
    
    Returns the created/updated SummonerData object.
    """
    from streampage.db.models import SummonerData
    
    # Fetch ranked data
    ranked_data = get_ranked_data_by_puuid(puuid)
    
    # Fetch recent matches
    recent_matches = get_recent_matches(puuid)
    
    # Check if we already have a record for this PUUID
    existing = session.query(SummonerData).filter(SummonerData.puuid == puuid).first()
    
    if existing:
        # Update existing record
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
        # Create new record
        summoner_data = SummonerData(
            puuid=puuid,
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


def get_cached_summoner_data(
    session: Session,
    puuid: str,
    game_name: str,
    tag_line: str,
    force_refresh: bool = False,
) -> "SummonerData":
    """Get summoner data from cache, fetching from Riot API if needed.
    
    Args:
        session: Database session
        puuid: The summoner's PUUID
        game_name: The summoner's game name (for caching)
        tag_line: The summoner's tag line (for caching)
        force_refresh: If True, always fetch fresh data from Riot API
    
    Returns:
        SummonerData object with cached (or freshly fetched) data
    """
    from streampage.db.models import SummonerData
    
    if not force_refresh:
        # Check if we have cached data that's still fresh
        cached = session.query(SummonerData).filter(SummonerData.puuid == puuid).first()
        
        if cached:
            cache_age = datetime.utcnow() - cached.last_updated
            if cache_age < timedelta(minutes=CACHE_DURATION_MINUTES):
                # Cache is still valid, return it
                return cached
    
    # Cache miss or expired - fetch fresh data
    return fetch_and_cache_summoner_data(session, puuid, game_name, tag_line)