from fastapi import APIRouter, Depends, HTTPException

from streampage.api.middleware.authenticator import get_current_user
from streampage.api.opgg.models import (
    AddOpggAccountRequest,
    RemoveOpggAccountRequest,
    SortOpggAccountsRequest,
    RemoveOpggGameRequest,
    ResponseMessage,
    RecentMatch,
    OpggAccountResponse,
    OpggAccountsResponse,
)
from streampage.db.engine import get_db_session
from streampage.db.models import OpggEntry, User, SummonerData
from streampage.db.riot import get_puuid, get_cached_summoner_data, fetch_and_cache_summoner_data


opgg_router = APIRouter()


@opgg_router.post("/add_account")
def add_opgg_account(
    request: AddOpggAccountRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Add an account to the OPGG list."""
    with get_db_session() as session:
        # Look up rosie's user_id (hardcoded page owner for now)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")

        # Get PUUID from Riot API
        summoners_puuid = get_puuid(request.summoner_name, request.tagline)
        if not summoners_puuid:
            raise HTTPException(status_code=400, detail="Invalid summoner name or tagline")

        # Check if account already exists
        existing = session.query(OpggEntry).filter(OpggEntry.puuid == summoners_puuid).first()
        if existing:
            raise HTTPException(status_code=400, detail="Account already added")

        # Fetch and cache summoner data
        get_cached_summoner_data(
            session,
            summoners_puuid,
            request.summoner_name,
            request.tagline,
            force_refresh=True,
        )

        # Get max display_order to add at the end
        max_order = session.query(OpggEntry).filter(
            OpggEntry.owner_id == rosie_user.id
        ).count()

        entry = OpggEntry(
            owner_id=rosie_user.id,
            contributor_id=user.id,
            puuid=summoners_puuid,
            display_order=max_order,
        )
        session.add(entry)
        session.commit()

        return ResponseMessage(message="Successfully added account")


@opgg_router.delete("/remove_account")
def remove_opgg_account(
    request: RemoveOpggAccountRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Remove an account from the OPGG list."""
    with get_db_session() as session:
        # Look up rosie's user_id
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")

        # Find the entry
        entry = session.query(OpggEntry).filter(OpggEntry.id == request.account_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Account not found")

        # Ensure user is the page owner
        if entry.owner_id != rosie_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to remove this account")

        # Also remove the associated summoner data
        summoner_data = session.query(SummonerData).filter(
            SummonerData.puuid == entry.puuid
        ).first()
        if summoner_data:
            session.delete(summoner_data)

        session.delete(entry)
        session.commit()

        return ResponseMessage(message="Successfully removed account")


@opgg_router.post("/sort_accounts")
def sort_opgg_accounts(
    request: SortOpggAccountsRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Update the display order of accounts."""
    with get_db_session() as session:
        # Look up rosie's user_id
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")

        # Update display_order for each account
        for index, account_id in enumerate(request.account_ids):
            entry = session.query(OpggEntry).filter(
                OpggEntry.id == account_id,
                OpggEntry.owner_id == rosie_user.id
            ).first()
            if entry:
                entry.display_order = index

        session.commit()

        return ResponseMessage(message="Successfully sorted accounts")


@opgg_router.delete("/remove_game")
def remove_opgg_game(
    request: RemoveOpggGameRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Remove a specific game from the match history."""
    with get_db_session() as session:
        # Find the summoner data
        summoner_data = session.query(SummonerData).filter(
            SummonerData.puuid == request.puuid
        ).first()
        if not summoner_data:
            raise HTTPException(status_code=404, detail="Summoner not found")

        # Check if we have matches and valid index
        if not summoner_data.recent_matches:
            raise HTTPException(status_code=400, detail="No matches to remove")

        if request.match_index < 0 or request.match_index >= len(summoner_data.recent_matches):
            raise HTTPException(status_code=400, detail="Invalid match index")

        # Remove the match at the specified index
        matches = list(summoner_data.recent_matches)
        matches.pop(request.match_index)
        summoner_data.recent_matches = matches

        session.commit()

        return ResponseMessage(message="Successfully removed game")


@opgg_router.get("/accounts")
def get_opgg_accounts() -> OpggAccountsResponse:
    """Get all OPGG accounts for the page."""
    with get_db_session() as session:
        # Find rosie (hardcoded page owner)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            return OpggAccountsResponse(accounts=[])

        # Get all entries ordered by display_order
        entries = session.query(OpggEntry).filter(
            OpggEntry.owner_id == rosie_user.id
        ).order_by(OpggEntry.display_order).all()

        accounts = []
        for entry in entries:
            # Get cached summoner data
            summoner_data = entry.summoner_data
            if not summoner_data:
                continue

            # Convert matches to response model
            recent_matches = []
            if summoner_data.recent_matches:
                recent_matches = [
                    RecentMatch(
                        champion_id=match.get("champion_id", 0),
                        champion_name=match.get("champion_name", "Unknown"),
                        win=match.get("win", False),
                        kills=match.get("kills", 0),
                        deaths=match.get("deaths", 0),
                        assists=match.get("assists", 0),
                    )
                    for match in summoner_data.recent_matches
                ]

            accounts.append(
                OpggAccountResponse(
                    id=str(entry.id),
                    puuid=entry.puuid,
                    display_order=entry.display_order,
                    game_name=summoner_data.game_name,
                    tag_line=summoner_data.tag_line,
                    tier=summoner_data.tier,
                    rank=summoner_data.rank,
                    league_points=summoner_data.league_points,
                    wins=summoner_data.wins,
                    losses=summoner_data.losses,
                    recent_matches=recent_matches,
                )
            )

        return OpggAccountsResponse(accounts=accounts)


@opgg_router.post("/refresh")
def refresh_opgg_accounts(
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Refresh all OPGG accounts data from Riot API."""
    with get_db_session() as session:
        # Find rosie (hardcoded page owner)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")

        # Get all entries
        entries = session.query(OpggEntry).filter(
            OpggEntry.owner_id == rosie_user.id
        ).all()

        # Refresh each account
        refreshed_count = 0
        for entry in entries:
            summoner_data = entry.summoner_data
            if summoner_data:
                try:
                    fetch_and_cache_summoner_data(
                        session,
                        entry.puuid,
                        summoner_data.game_name,
                        summoner_data.tag_line,
                    )
                    refreshed_count += 1
                except Exception:
                    # Continue with other accounts if one fails
                    pass

        session.commit()

        return ResponseMessage(message=f"Successfully refreshed {refreshed_count} accounts")

