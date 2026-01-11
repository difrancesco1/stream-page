from typing import Optional
from pydantic import BaseModel

from streampage.db.enums import MediaCategory


class AddMediaRequest(BaseModel):
    category: MediaCategory
    name: str
    info: str
    url: str


class RemoveMediaRequest(BaseModel):
    media_id: str


class EditMediaRequest(BaseModel):
    media_id: str
    category: Optional[MediaCategory] = None
    name: Optional[str] = None
    info: Optional[str] = None
    url: Optional[str] = None


class UpdateMediaRequest(BaseModel):
    """Update media name and/or info fields."""
    name: Optional[str] = None
    info: Optional[str] = None
    url: Optional[str] = None


class UpvoteMediaRequest(BaseModel):
    media_id: str


class SortMediaRequest(BaseModel):
    """List of media IDs in the desired order."""
    media_ids: list[str]


class ResponseMessage(BaseModel):
    message: str


class MediaResponse(BaseModel):
    id: str
    category: str
    name: str
    info: str
    url: str
    display_order: int
    upvote_count: int
    user_has_upvoted: bool = False


class MediaListResponse(BaseModel):
    media: list[MediaResponse]

