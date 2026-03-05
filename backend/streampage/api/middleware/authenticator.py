import logging
from datetime import datetime
from datetime import timedelta
from datetime import timezone

import jwt

logger = logging.getLogger(__name__)
from fastapi import Depends
from fastapi import HTTPException

from streampage.config import ALGORITHM
from streampage.config import OAUTH2_SCHEME
from streampage.config import OAUTH2_SCHEME_OPTIONAL
from streampage.config import SECRET_KEY
from streampage.db.engine import get_db_session
from streampage.db.models import User
from streampage.db.models import UserLogin


def _encode_token(token_data: dict) -> str:
    encoded = jwt.encode(token_data, SECRET_KEY, ALGORITHM)
    if isinstance(encoded, bytes):
        return encoded.decode("utf-8")
    return encoded


def create_access_token(user_login: UserLogin) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    token_data = {
        "username": user_login.username,
        "type": "access",
        "exp": expires_at,
    }
    return _encode_token(token_data), expires_at


def create_refresh_token(user_login: UserLogin) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    token_data = {
        "username": user_login.username,
        "type": "refresh",
        "exp": expires_at,
    }
    return _encode_token(token_data), expires_at


def validate_refresh_token(token: str) -> str:
    """Decode a refresh token and return the username.

    Raises HTTPException on any validation failure.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    username = payload.get("username")
    if not isinstance(username, str):
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    return username


def get_current_user(token: str = Depends(OAUTH2_SCHEME)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        logger.error("Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        logger.error("Invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        raise HTTPException(
            status_code=401, detail=f"Error getting current user: {str(e)}"
        )

    username = payload.get("username")
    if not isinstance(username, str) or username is None:
        raise HTTPException(status_code=401, detail="Can't get username from payload")

    with get_db_session() as db:
        try:
            user_login = (
                db.query(User)
                .join(User.logins)
                .filter(User.username == username)
                .first()
            )
            if user_login is None:
                raise HTTPException(status_code=401, detail="Can't get user")
            return user_login
        except Exception as e:
            logger.error(f"Database error in get_current_user: {str(e)}")
            raise HTTPException(status_code=401, detail="Database error")


def get_optional_current_user(token: str | None = Depends(OAUTH2_SCHEME_OPTIONAL)) -> User | None:
    """Get the current user if authenticated, otherwise return None."""
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        return None

    username = payload.get("username")
    if not isinstance(username, str) or username is None:
        return None

    with get_db_session() as db:
        try:
            user = (
                db.query(User)
                .join(User.logins)
                .filter(User.username == username)
                .first()
            )
            return user
        except Exception:
            return None


def require_creator(user: User = Depends(get_current_user)) -> User:
    """Require that the current user is the creator (rosie).
    
    Args:
        user: The authenticated user from get_current_user
        
    Returns:
        The user if they are the creator
        
    Raises:
        HTTPException: 403 if the user is not the creator
    """
    if user.username.lower() != "rosie":
        raise HTTPException(
            status_code=403, 
            detail="Only the page creator can perform this action"
        )
    return user