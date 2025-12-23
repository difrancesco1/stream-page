from uuid import UUID

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: UUID
    username: str
    display_name: str | None
    birthday: str | None
    profile_picture: str | None

