
from fastapi import APIRouter, Depends

from streampage.api.middleware.authenticator import get_current_user
from streampage.api.riot.models import AddToIntListRequest, ResponseMessage
from streampage.db.engine import get_db_session
from streampage.db.models import IntListEntry
from streampage.db.riot import get_puuid


riot_router = APIRouter()

@riot_router.post("/add_to_int_list")
def add_to_int_list(
    add_to_int_list_request: AddToIntListRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    with get_db_session() as session:
        summoners_puuid = get_puuid(
            add_to_int_list_request.summoner_name, 
            add_to_int_list_request.tagline
        )
        if not summoners_puuid:
            return ResponseMessage(message="Invalid summoner name or tagline")

        entry = IntListEntry(
            creator_id=user.id,
            puuid=summoners_puuid,
            summoner_name=add_to_int_list_request.summoner_name,
            summoner_tag=add_to_int_list_request.tagline,
            user_reason=add_to_int_list_request.user_reason,
        )
        session.add(entry)
        session.commit()

        return ResponseMessage(message="Successfully added to int list")
