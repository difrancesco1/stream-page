"""Seed database with default user if empty."""
from streampage.db.engine import get_db_session
from streampage.db.models import User, UserLogin
from streampage.api.user.auth import hash_password


def seed():
    with get_db_session() as session:
        if session.query(User).first():
            print("Users exist, skipping seed.")
            return
        
        user = User(username="rosie")
        session.add(user)
        session.flush()
        
        user_login = UserLogin(user=user, password=hash_password("Password1!"))
        session.add(user_login)
        session.commit()
        print("Created user: rosie")


if __name__ == "__main__":
    seed()
