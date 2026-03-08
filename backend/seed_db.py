"""Seed database with default user if empty."""
from streampage.db.engine import get_db_session
from streampage.db.models import User, UserLogin, FirstEntry
from streampage.api.user.auth import hash_password


FIRST_ENTRIES = [
    ("TrevorKTran", 44),
    ("The_Beastly_D", 40),
    ("swordex123", 32),
    ("Lokimjolnir", 31),
    ("Skilliams_TV", 29),
    ("parathaxx", 24),
    ("SputNikPlop", 19),
    ("PathToDeath", 16),
    ("sigyetaeyeob", 16),
    ("liukunmj23", 14),
    ("andyboylol", 12),
    ("Natook", 12),
    ("XgameJ", 11),
    ("spyder199", 10),
    ("Foodcloud", 10),
    ("Frozenfruit13", 9),
    ("Romeoxt", 9),
    ("Syrain", 8),
    ("AinAndDine", 8),
    ("bS000", 7),
    ("TurtleOnCrack", 4),
    ("subuwuWRX", 4),
    ("Diepsigh", 4),
    ("crescent_rxse", 3),
    ("iamjavi", 3),
    ("saucysaucetony", 3),
    ("markelause", 3),
    ("mel_4d", 3),
    ("anarchythesinner", 2),
    ("Kohaku_Ryu", 2),
    ("KP_McGee", 2),
    ("princet8c", 2),
    ("DigitalLaw", 2),
    ("Halofan642", 1),
    ("S2TibersS2", 1),
    ("sivicx", 1),
    ("avespring", 1),
    ("ZeroXInfinity44", 1),
    ("blubbieboi", 1),
    ("getreckt16", 1),
    ("TokidokiCosplay", 1),
    ("Basstastic", 1),
    ("fabri_sosa_", 1),
    ("bobadrinks", 1),
    ("ArkadyBogdanov", 1),
    ("WrenStokely", 1),
    ("samshiney", 1),
    ("lol_gutex", 1),
    ("ItsSamanthics", 1),
    ("Molequles", 1),
    ("GnawMe", 1),
]


def seed():
    with get_db_session() as session:
        if session.query(User).first():
            print("Users exist, skipping user seed.")
            user = session.query(User).filter(User.username == "rosie").first()
        else:
            user = User(username="rosie")
            session.add(user)
            session.flush()

            user_login = UserLogin(user=user, username="rosie", password=hash_password("Password1!"))
            session.add(user_login)
            session.commit()
            print("Created user: rosie")

        if not user:
            print("Rosie user not found, cannot seed first entries.")
            return

        existing_count = session.query(FirstEntry).filter(FirstEntry.owner_id == user.id).count()
        if existing_count > 0:
            print(f"First entries already exist ({existing_count}), skipping.")
            return

        for name, count in FIRST_ENTRIES:
            entry = FirstEntry(owner_id=user.id, name=name, first_count=count)
            session.add(entry)

        session.commit()
        print(f"Seeded {len(FIRST_ENTRIES)} first entries for rosie.")


if __name__ == "__main__":
    seed()
