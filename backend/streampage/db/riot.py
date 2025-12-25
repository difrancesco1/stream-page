import httpx
from urllib.parse import quote

from streampage.config import RIOT_API_KEY


RIOT_ACCOUNT_API_BASE = "https://americas.api.riotgames.com"


def get_puuid(game_name: str, tag_line: str) -> str:
    encoded_name = quote(game_name)
    url = f"{RIOT_ACCOUNT_API_BASE}/riot/account/v1/accounts/by-riot-id/{encoded_name}/{tag_line}"
    
    with httpx.Client() as client:
        response = client.get(url, params={"api_key": RIOT_API_KEY})
        response.raise_for_status()
        data = response.json()
        return data["puuid"]