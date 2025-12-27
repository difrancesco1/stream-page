from typing import Optional

from fastapi import APIRouter, Depends

from streampage.api.middleware.authenticator import get_current_user
from streampage.api.riot.models import (
    AddToIntListRequest,
    IntListContributor,
    IntListContributorsResponse,
    IntListEntryResponse,
    IntListResponse,
    RecentMatch,
    ResponseMessage,
)
from streampage.db.engine import get_db_session
from streampage.db.models import IntListEntry, User
from streampage.db.riot import get_puuid, get_cached_summoner_data


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

        # Fetch and cache summoner data (this will also give us the rank)
        summoner_data = get_cached_summoner_data(
            session,
            summoners_puuid,
            add_to_int_list_request.summoner_name,
            add_to_int_list_request.tagline,
            force_refresh=True,  # Always get fresh data when adding
        )
        
        # Format rank_when_added from cached data
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
    
    Uses cached summoner data from the database instead of live API calls.
    Data is refreshed automatically when cache expires (30 min by default).
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
            # Get cached summoner data (will fetch from API if cache expired)
            summoner_data = get_cached_summoner_data(
                session,
                entry.puuid,
                entry.summoner_name,
                entry.summoner_tag,
            )
            
            # Format current rank from cached data
            current_rank = None
            if summoner_data.tier:
                current_rank = f"{summoner_data.tier} {summoner_data.rank or ''} {summoner_data.league_points or 0}LP"
            else:
                current_rank = "UNRANKED"
            
            # Convert cached match data to RecentMatch models
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
        
        # Commit any new cache entries that were created
        session.commit()
        
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
