from fastapi import HTTPException
from fastapi import APIRouter
from fastapi import Depends
from fastapi import status

from streampage.api.middleware.authenticator import create_access_token, get_current_user
from streampage.api.user.auth import hash_password, verify_password
from streampage.api.user.models import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
)
from streampage.db.engine import get_db_session
from streampage.db.models import User, UserLogin

users_router = APIRouter()


@users_router.post("/register")
def register(request: RegisterRequest) -> UserResponse:
    """Register a new user with username and password."""
    with get_db_session() as session:
        # Check if username already exists
        existing_user = session.query(User).filter(User.username == request.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        # Create new user
        user = User(username=request.username)
        session.add(user)
        session.flush()  # Get the user ID

        # Create login entry with hashed password
        hashed_password = hash_password(request.password)
        user_login = UserLogin(user=user, password=hashed_password)
        session.add(user_login)
        session.commit()

        return UserResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            birthday=user.birthday,
            profile_picture=user.profile_picture,
        )


@users_router.post("/login")
def login(request: LoginRequest) -> LoginResponse:
    """Login with username and password, returns JWT token."""
    with get_db_session() as session:
        # Find user login
        user_login = (
            session.query(UserLogin)
            .filter(UserLogin.username == request.username)
            .first()
        )

        if not user_login:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify password
        if not verify_password(request.password, user_login.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create JWT token
        access_token, _ = create_access_token(user_login)

        return LoginResponse(access_token=access_token)


@users_router.get("/user")
def get_user_with_jwt(current_user=Depends(get_current_user)) -> UserResponse:
    """Get current user from JWT token."""
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
