from fastapi import HTTPException
from fastapi import APIRouter
from fastapi import Depends
from fastapi import status

from streampage.api.middleware.authenticator import get_current_user
from streampage.api.user.models import UserResponse

users_router = APIRouter()

@users_router.get("/user")
def get_user_with_jwt(current_user=Depends(get_current_user)) -> UserResponse:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid JWT Token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        birthday=current_user.birthday,
        profile_picture=current_user.profile_picture,
    )