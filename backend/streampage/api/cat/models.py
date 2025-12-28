from datetime import datetime
from pydantic import BaseModel


class RemoveCatRequest(BaseModel):
    cat_id: str


class ResponseMessage(BaseModel):
    message: str


class CatResponse(BaseModel):
    id: str
    image_url: str
    contributor_username: str
    created_at: datetime


class CatListResponse(BaseModel):
    cats: list[CatResponse]

