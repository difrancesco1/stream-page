from fastapi import APIRouter, Depends, HTTPException
import uuid

from streampage.api.middleware.authenticator import get_current_user, require_creator
from streampage.api.opgg.models import (
    AddOpggAccountRequest,
    RemoveOpggAccountRequest,
    SortOpggAccountsRequest,
    HideOpggGameRequest,
    UnhideOpggGameRequest,
    UnhideAllGamesRequest,
    ResponseMessage,
    RecentMatch,
    OpggAccountResponse,
    OpggAccountsResponse,
)
from streampage.db.engine import get_db_session
from streampage.db.models import OpggEntry, User, SummonerData, HiddenMatch
from streampage.db.riot import get_puuid, fetch_and_store_summoner_data


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

        # Fetch and store summoner data
        fetch_and_store_summoner_data(
            session,
            summoners_puuid,
            request.summoner_name,
            request.tagline,
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


@opgg_router.post("/hide_game")
def hide_opgg_game(
    request: HideOpggGameRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Hide a specific game from the match history (persists across refreshes)."""
    with get_db_session() as session:
        # Look up rosie's user_id (hardcoded page owner for now)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")

        # Check if already hidden
        existing = session.query(HiddenMatch).filter(
            HiddenMatch.owner_id == rosie_user.id,
            HiddenMatch.match_id == request.match_id,
        ).first()
        if existing:
            return ResponseMessage(message="Game already hidden")

        # Add to hidden matches
        hidden = HiddenMatch(
            owner_id=rosie_user.id,
            match_id=request.match_id,
        )
        session.add(hidden)
        session.commit()

        return ResponseMessage(message="Successfully hidden game")


@opgg_router.get("/accounts")
def get_opgg_accounts(include_hidden: bool = False) -> OpggAccountsResponse:
    """Get all OPGG accounts for the page."""
    with get_db_session() as session:
        # Find rosie (hardcoded page owner)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            return OpggAccountsResponse(accounts=[])

        # Get hidden match IDs for this owner (only if we're filtering)
        hidden_match_ids = set()
        if not include_hidden:
            hidden_match_ids = set(
                row.match_id for row in session.query(HiddenMatch.match_id).filter(
                    HiddenMatch.owner_id == rosie_user.id
                ).all()
            )

        # Get all entries ordered by display_order
        entries = session.query(OpggEntry).filter(
            OpggEntry.owner_id == rosie_user.id
        ).order_by(OpggEntry.display_order).all()

        accounts = []
        for entry in entries:
            # Get stored summoner data
            summoner_data = entry.summoner_data
            if not summoner_data:
                continue

            # Convert matches to response model, filtering out hidden matches unless include_hidden
            recent_matches = []
            if summoner_data.recent_matches:
                recent_matches = [
                    RecentMatch(
                        match_id=match.get("match_id", ""),
                        champion_id=match.get("champion_id", 0),
                        champion_name=match.get("champion_name", "Unknown"),
                        win=match.get("win", False),
                        kills=match.get("kills", 0),
                        deaths=match.get("deaths", 0),
                        assists=match.get("assists", 0),
                    )
                    for match in summoner_data.recent_matches
                    if include_hidden or match.get("match_id") not in hidden_match_ids
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
                    fetch_and_store_summoner_data(
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


@opgg_router.post("/unhide_game")
def unhide_opgg_game(
    request: UnhideOpggGameRequest,
    user=Depends(require_creator),
) -> ResponseMessage:
    """Unhide a specific game. Only creator can unhide."""
    with get_db_session() as session:
        # Find rosie
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")
        
        # Find and delete the hidden match record
        hidden = session.query(HiddenMatch).filter(
            HiddenMatch.owner_id == rosie_user.id,
            HiddenMatch.match_id == request.match_id
        ).first()
        
        if not hidden:
            raise HTTPException(status_code=404, detail="Hidden game not found")
        
        session.delete(hidden)
        session.commit()
        
        return ResponseMessage(message="Successfully unhid game")


@opgg_router.post("/unhide_all_games")
def unhide_all_opgg_games(
    request: UnhideAllGamesRequest,
    user=Depends(require_creator),
) -> ResponseMessage:
    """Unhide all games, optionally for a specific account. Only creator can unhide."""
    with get_db_session() as session:
        # Find rosie
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")
        
        # Base query for hidden matches
        query = session.query(HiddenMatch).filter(HiddenMatch.owner_id == rosie_user.id)
        
        # If account_id specified, filter by that account's matches
        if request.account_id:
            try:
                account_uuid = uuid.UUID(request.account_id)
                account = session.query(OpggEntry).filter(OpggEntry.id == account_uuid).first()
                if not account:
                    raise HTTPException(status_code=404, detail="Account not found")
                
                # Get all match IDs for this account from summoner data
                summoner_data = account.summoner_data
                if summoner_data and summoner_data.recent_matches:
                    match_ids = [match.get("match_id") for match in summoner_data.recent_matches]
                    query = query.filter(HiddenMatch.match_id.in_(match_ids))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid account ID format")
        
        # Delete all matching hidden records
        count = query.delete(synchronize_session=False)
        session.commit()
        
        return ResponseMessage(message=f"Successfully unhid {count} games")


@opgg_router.put("/reorder_accounts")
def reorder_opgg_accounts(
    request: SortOpggAccountsRequest,
    user=Depends(require_creator),
) -> ResponseMessage:
    """Reorder OPGG accounts. Only creator can reorder."""
    with get_db_session() as session:
        # Find rosie
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")
        
        # Update display_order for each account
        for index, account_id in enumerate(request.account_ids):
            try:
                account_uuid = uuid.UUID(account_id)
                account = session.query(OpggEntry).filter(
                    OpggEntry.id == account_uuid,
                    OpggEntry.owner_id == rosie_user.id
                ).first()
                
                if account:
                    account.display_order = index
            except ValueError:
                continue  # Skip invalid UUIDs
        
        session.commit()
        
        return ResponseMessage(message="Successfully reordered accounts")

