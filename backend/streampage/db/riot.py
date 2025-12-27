import httpx
from typing import Optional
from urllib.parse import quote

from streampage.config import RIOT_API_KEY


RIOT_ACCOUNT_API_BASE = "https://americas.api.riotgames.com"
RIOT_NA_API_BASE = "https://na1.api.riotgames.com"


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
    """Get champion ID and win/loss for a specific match and player.
    
    Returns: {"champion_id": int, "champion_name": str, "win": bool} or None
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
                    "champion_id": participant.get("championId"),
                    "champion_name": participant.get("championName"),
                    "win": participant.get("win", False)
                }
        
        return None


def get_recent_matches(puuid: str) -> list[dict]:
    """Get details for the last 10 matches.
    
    Returns: list of {"champion_id": int, "champion_name": str, "win": bool}
    """
    match_ids = get_last_10_match_ids(puuid)
    matches = []
    
    for match_id in match_ids:
        details = get_match_details(match_id, puuid)
        if details:
            matches.append(details)
    
    return matches