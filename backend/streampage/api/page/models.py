from pydantic import BaseModel


class ResponseMessage(BaseModel):
    message: str


class PageConfigResponse(BaseModel):
    owner_id: str
    background_image: str | None

