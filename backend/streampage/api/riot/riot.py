from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException

from streampage.api.middleware.authenticator import get_current_user, require_creator
from streampage.api.riot.models import (
    AddToIntListRequest,
    IntListContributor,
    IntListContributorsResponse,
    IntListEntryResponse,
    IntListResponse,
    RecentMatch,
    ResponseMessage,
    UpdateIntListEntryRequest,
)
from streampage.db.engine import get_db_session
from streampage.db.models import IntListEntry, SummonerData, User
from streampage.db.riot import get_puuid, fetch_and_store_summoner_data


riot_router = APIRouter()

@riot_router.post("/add_to_int_list")
def add_to_int_list(
    add_to_int_list_request: AddToIntListRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    with get_db_session() as session:
        # Lookup rosie's user_id (hardcoded page owner for now)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            return ResponseMessage(message="Page owner not found")
        
        summoners_puuid = get_puuid(
            add_to_int_list_request.summoner_name, 
            add_to_int_list_request.tagline
        )
        if not summoners_puuid:
            return ResponseMessage(message="Invalid summoner name or tagline")

        # Fetch and store summoner data (this will also give us the rank)
        summoner_data = fetch_and_store_summoner_data(
            session,
            summoners_puuid,
            add_to_int_list_request.summoner_name,
            add_to_int_list_request.tagline,
        )
        
        # Format rank_when_added from fetched data
        rank_when_added = None
        if summoner_data.tier:
            rank_when_added = f"{summoner_data.tier} {summoner_data.rank or ''} {summoner_data.league_points or 0}LP"

        entry = IntListEntry(
            page_owner_id=rosie_user.id,
            contributor_id=user.id,
            puuid=summoners_puuid,
            summoner_name=add_to_int_list_request.summoner_name,
            summoner_tag=add_to_int_list_request.tagline,
            user_reason=add_to_int_list_request.user_reason,
            rank_when_added=rank_when_added,
        )
        session.add(entry)
        session.commit()

        return ResponseMessage(message="Successfully added to int list")


@riot_router.get("/int_list")
def get_int_list(
    contributor_id: Optional[str] = None,
) -> IntListResponse:
    """Get int list entries for rosie's page, optionally filtered by contributor.
    
    Displays stored summoner data from the database. No automatic refresh.
    """
    with get_db_session() as session:
        # Find rosie (hardcoded page owner)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            return IntListResponse(entries=[])
        
        # Query entries for rosie's page, join with contributor user
        query = session.query(IntListEntry, User).join(
            User, IntListEntry.contributor_id == User.id
        ).filter(IntListEntry.page_owner_id == rosie_user.id)
        
        # Optionally filter by contributor
        if contributor_id:
            query = query.filter(IntListEntry.contributor_id == contributor_id)
        
        results = query.all()
        
        entries = []
        for entry, contributor_user in results:
            # Get stored summoner data
            summoner_data = session.query(SummonerData).filter(SummonerData.puuid == entry.puuid).first()
            
            # Format current rank from stored data
            current_rank = "UNRANKED"
            recent_matches = []
            
            if summoner_data:
                if summoner_data.tier:
                    current_rank = f"{summoner_data.tier} {summoner_data.rank or ''} {summoner_data.league_points or 0}LP"
                
                # Convert stored match data to RecentMatch models
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
            
            entries.append(
                IntListEntryResponse(
                    id=str(entry.id),
                    summoner_name=entry.summoner_name,
                    summoner_tag=entry.summoner_tag,
                    user_reason=entry.user_reason,
                    contributor_username=contributor_user.username,
                    rank_when_added=entry.rank_when_added,
                    current_rank=current_rank,
                    recent_matches=recent_matches,
                )
            )
        
        return IntListResponse(entries=entries)


@riot_router.get("/int_list/contributors")
def get_int_list_contributors() -> IntListContributorsResponse:
    """Get unique contributors to rosie's int list."""
    with get_db_session() as session:
        # Find rosie (hardcoded page owner)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            return IntListContributorsResponse(contributors=[])
        
        # Get distinct contributors for rosie's page
        results = (
            session.query(User)
            .join(IntListEntry, IntListEntry.contributor_id == User.id)
            .filter(IntListEntry.page_owner_id == rosie_user.id)
            .distinct()
            .all()
        )
        
        contributors = [
            IntListContributor(
                user_id=str(user.id),
                username=user.username,
            )
            for user in results
        ]
        
        return IntListContributorsResponse(contributors=contributors)


@riot_router.post("/int_list/{entry_id}/refresh")
def refresh_int_list_entry(
    entry_id: str,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Manually refresh summoner data for an int list entry."""
    with get_db_session() as session:
        entry = session.query(IntListEntry).filter(IntListEntry.id == entry_id).first()
        if not entry:
            return ResponseMessage(message="Entry not found")
        
        fetch_and_store_summoner_data(
            session,
            entry.puuid,
            entry.summoner_name,
            entry.summoner_tag,
        )
        session.commit()
        
        return ResponseMessage(message="Summoner data refreshed")


@riot_router.patch("/int_list/{entry_id}")
def update_int_list_entry(
    entry_id: str,
    request: UpdateIntListEntryRequest,
    user=Depends(require_creator),
) -> ResponseMessage:
    """Update the reason for an int list entry. Only creator can update."""
    with get_db_session() as session:
        try:
            entry_uuid = uuid.UUID(entry_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid entry ID format")
        
        entry = session.query(IntListEntry).filter(IntListEntry.id == entry_uuid).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        entry.user_reason = request.user_reason
        session.commit()
        
        return ResponseMessage(message="Entry updated successfully")


@riot_router.delete("/int_list/{entry_id}")
def delete_int_list_entry(
    entry_id: str,
    user=Depends(require_creator),
) -> ResponseMessage:
    """Delete an int list entry. Only creator can delete."""
    with get_db_session() as session:
        try:
            entry_uuid = uuid.UUID(entry_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid entry ID format")
        
        entry = session.query(IntListEntry).filter(IntListEntry.id == entry_uuid).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        session.delete(entry)
        session.commit()
        
        return ResponseMessage(message="Entry deleted successfully")
