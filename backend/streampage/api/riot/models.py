from uuid import UUID
from pydantic import BaseModel


class AddToIntListRequest(BaseModel):
    creator_id: UUID
    user_id: UUID
    summoner_name: str
    tagline: str
    user_reason: str
    
    
class ResponseMessage(BaseModel):
    message: str