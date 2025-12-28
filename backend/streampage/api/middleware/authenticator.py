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
from streampage.config import SECRET_KEY
from streampage.db.engine import get_db_session
from streampage.db.models import User
from streampage.db.models import UserLogin


def create_access_token(user_login: UserLogin) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    token_data = {
        "username": user_login.username,
        "exp": expires_at,
    }
    encoded_token = jwt.encode(token_data, SECRET_KEY, ALGORITHM)

    if isinstance(encoded_token, bytes):
        token = encoded_token.decode("utf-8")
    else:
        token = encoded_token

    return token, expires_at


def get_current_user(token: str = Depends(OAUTH2_SCHEME)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        logger.error("Token has expired")
        raise HTTPException(status_code=403, detail="Token has expired")
    except jwt.InvalidTokenError:
        logger.error("Invalid token")
        raise HTTPException(status_code=403, detail="Invalid token")
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        raise HTTPException(
            status_code=403, detail=f"Error getting current user: {str(e)}"
        )

    username = payload.get("username")
    if not isinstance(username, str) or username is None:
        raise HTTPException(status_code=403, detail="Can't get username from payload")

    with get_db_session() as db:
        try:
            pass

            user_login = (
                db.query(User)
                .join(User.logins)
                .filter(User.username == username)
                .first()
            )
            if user_login is None:
                raise HTTPException(status_code=403, detail="Can't get user")
            return user_login
        except Exception as e:
            logger.error(f"Database error in get_current_user: {str(e)}")
            raise HTTPException(status_code=403, detail="Database error")


def get_optional_current_user(token: str | None = Depends(OAUTH2_SCHEME)) -> User | None:
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