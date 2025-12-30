from uuid import UUID

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: UUID
    username: str
    display_name: str | None
    birthday: str | None
    profile_picture: str | None


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    birthday: str | None = None
    biography: list[str] | None = None


class SocialLinkRequest(BaseModel):
    platform: str
    url: str


class SocialLinkResponse(BaseModel):
    platform: str
    url: str


class UpdateSocialLinksRequest(BaseModel):
    social_links: list[SocialLinkRequest]


class PublicProfileResponse(BaseModel):
    display_name: str | None
    birthday: str | None
    profile_picture: str | None
    biography: list[str] | None
    social_links: list[SocialLinkResponse] | None
    featured_image: str | None


class ResponseMessage(BaseModel):
    message: str