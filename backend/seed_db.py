"""Seed database with default user if empty."""
from streampage.db.engine import get_db_session
from streampage.db.models import User, UserLogin, FirstEntry, DuoEntry, DuoEntryAccount
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


DUO_ENTRIES = [
    ("lilAnnabelle#NA1", 7, 4, "gamerelf vlad god"),
    ("curse#NA2", 2, 3, "thresh player. sus in among us"),
    ("Akito#NA1", 6, 3, "janna main but doesn't play janna"),
    ("spongebob#TVO", 3, 2, "tyson1"),
    ("greeenpink#NA1", 2, 2, "fred"),
    ("TrevorKTran#Wish", 4, 0, "cait/mf goat"),
    ("Summer July Rain#NA0", 0, 3, "sry."),
    ("GnawMe#SOLAR", 2, 1, "sigh"),
    ("Gon#small", 2, 1, "smol-der"),
    ("marcellui#NA1", 1, 2, "sry marcell"),
    ("Claver#SOMA", 2, 2, "picky cleric retail wow player #boston does not honor me but will prime sub"),
    ("Thumper#Frank", 1, 1, "verma"),
    ("Esudesu#NA1", 2, 0, "just on my fl"),
    ("QarthO#NA1", 2, 0, "arena player"),
    ("IlIIlIlIIIIIIIll#NA1", 2, 0, "puppeh fk this guy"),
    ("rellge#ILMBF", 2, 0, "loves her bf :3 asks to play then disappears D:"),
    ("yearner#wish", 0, 2, "very nice for a jungler"),
    ("Let Me Adem#MOAK", 0, 1, "asol power"),
    ("Gromp Rider#SEJ", 0, 1, "experience ruined due to fool#pyke"),
    ("Munke#lol", 1, 0, "just played 1 the betrayal"),
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
            print("Rosie user not found, cannot seed entries.")
            return

        # Seed first entries
        existing_first = session.query(FirstEntry).filter(FirstEntry.owner_id == user.id).count()
        if existing_first > 0:
            print(f"First entries already exist ({existing_first}), skipping.")
        else:
            for name, count in FIRST_ENTRIES:
                entry = FirstEntry(owner_id=user.id, name=name, first_count=count)
                session.add(entry)
            session.commit()
            print(f"Seeded {len(FIRST_ENTRIES)} first entries for rosie.")

        # Seed duo entries
        existing_duo = session.query(DuoEntry).filter(DuoEntry.owner_id == user.id).count()
        if existing_duo > 0:
            print(f"Duo entries already exist ({existing_duo}), skipping.")
        else:
            for summoner_name, wins, losses, note in DUO_ENTRIES:
                entry = DuoEntry(owner_id=user.id, name=None, wins=wins, losses=losses, note=note)
                session.add(entry)
                session.flush()
                session.add(DuoEntryAccount(entry_id=entry.id, summoner_name=summoner_name))
            session.commit()
            print(f"Seeded {len(DUO_ENTRIES)} duo entries for rosie.")


if __name__ == "__main__":
    seed()
