import uuid
import time
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from streampage.api.duo.models import (
    RecordDuoRequest,
    UpdateDuoRequest,
    AddAccountRequest,
    SetAccountRequest,
    DuoEntryResponse,
    DuoEntryAccountResponse,
    DuoListResponse,
    TrackedAccountResponse,
    ResponseMessage,
)
from streampage.api.middleware.authenticator import require_creator
from streampage.db.engine import get_db_session
from streampage.db.models import DuoEntry, DuoEntryAccount, DuoMatch, DuoTrackedAccount, User
from streampage.db.riot import get_puuid, get_all_ranked_match_ids, get_match_teammates, RATE_LIMIT_DELAY

logger = logging.getLogger(__name__)

duo_router = APIRouter()


def _get_rosie(session) -> User:
    rosie = session.execute(
        select(User).where(User.username == "rosie")
    ).scalar_one_or_none()
    if not rosie:
        raise HTTPException(status_code=500, detail="Rosie user not found")
    return rosie


def _recalculate_duo_entries(session, owner_id: uuid.UUID) -> int:
    """Recount wins/losses for every duo entry from stored matches."""
    entries = session.execute(
        select(DuoEntry)
        .options(selectinload(DuoEntry.accounts))
        .where(DuoEntry.owner_id == owner_id)
    ).scalars().all()

    matches = session.execute(
        select(DuoMatch).where(DuoMatch.owner_id == owner_id)
    ).scalars().all()

    updated = 0
    for entry in entries:
        names = {a.summoner_name.strip().lower() for a in entry.accounts}
        wins = 0
        losses = 0
        for m in matches:
            if names & set(m.teammates):
                if m.win:
                    wins += 1
                else:
                    losses += 1
        if entry.wins != wins or entry.losses != losses:
            entry.wins = wins
            entry.losses = losses
            updated += 1

    return updated


def _fetch_and_store_matches(session, account: DuoTrackedAccount) -> int:
    """Fetch new ranked matches for the tracked account and store them.

    Returns the number of newly stored matches.
    """
    existing_ids = set(
        session.execute(
            select(DuoMatch.match_id).where(DuoMatch.owner_id == account.owner_id)
        ).scalars().all()
    )

    new_match_ids = get_all_ranked_match_ids(account.puuid, known_ids=existing_ids)
    stored = 0

    for i, match_id in enumerate(new_match_ids):
        if match_id in existing_ids:
            continue
        if i > 0:
            time.sleep(RATE_LIMIT_DELAY)
        try:
            result = get_match_teammates(match_id, account.puuid)
            if result is None:
                continue
            win, teammates, played_at = result
            session.add(DuoMatch(
                match_id=match_id,
                owner_id=account.owner_id,
                win=win,
                teammates=teammates,
                played_at=played_at,
            ))
            stored += 1
        except Exception:
            logger.warning("Failed to process match %s", match_id)

    account.last_updated = datetime.utcnow()
    return stored


def _entry_to_response(e: DuoEntry) -> DuoEntryResponse:
    return DuoEntryResponse(
        id=str(e.id),
        name=e.display_name,
        wins=e.wins,
        losses=e.losses,
        games_played=e.wins + e.losses,
        result=f"{e.wins}-{e.losses}",
        note=e.note,
        accounts=[
            DuoEntryAccountResponse(id=str(a.id), summoner_name=a.summoner_name)
            for a in e.accounts
        ],
        created_at=e.created_at,
    )


@duo_router.get("/list")
def list_duos() -> DuoListResponse:
    with get_db_session() as session:
        rosie = _get_rosie(session)

        entries = session.execute(
            select(DuoEntry)
            .options(selectinload(DuoEntry.accounts))
            .where(DuoEntry.owner_id == rosie.id)
            .order_by((DuoEntry.wins + DuoEntry.losses).desc())
        ).scalars().all()

        since_dt = session.execute(
            select(func.min(DuoEntry.created_at))
            .where(DuoEntry.owner_id == rosie.id)
        ).scalar()

    since_str = f"{since_dt.month}/{since_dt.day}/{since_dt.year}" if since_dt else None

    return DuoListResponse(
        entries=[_entry_to_response(e) for e in entries],
        since=since_str,
    )


@duo_router.get("/account")
def get_account(
    user: User = Depends(require_creator),
) -> TrackedAccountResponse | None:
    with get_db_session() as session:
        account = session.execute(
            select(DuoTrackedAccount).where(DuoTrackedAccount.owner_id == user.id)
        ).scalar_one_or_none()

        if not account:
            return None

        match_count = session.execute(
            select(func.count()).select_from(DuoMatch).where(DuoMatch.owner_id == user.id)
        ).scalar() or 0

    return TrackedAccountResponse(
        game_name=account.game_name,
        tag_line=account.tag_line,
        last_updated=account.last_updated,
        match_count=match_count,
    )


@duo_router.post("/account")
def set_account(
    request: SetAccountRequest,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    game_name = request.game_name.strip()
    tag_line = request.tag_line.strip()
    if not game_name or not tag_line:
        raise HTTPException(status_code=400, detail="Game name and tag are required")

    try:
        puuid = get_puuid(game_name, tag_line)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Could not resolve {game_name}#{tag_line}")

    with get_db_session() as session:
        existing = session.execute(
            select(DuoTrackedAccount).where(DuoTrackedAccount.owner_id == user.id)
        ).scalar_one_or_none()

        if existing:
            existing.puuid = puuid
            existing.game_name = game_name
            existing.tag_line = tag_line
            account = existing
        else:
            account = DuoTrackedAccount(
                owner_id=user.id,
                puuid=puuid,
                game_name=game_name,
                tag_line=tag_line,
            )
            session.add(account)
            session.flush()

        stored = _fetch_and_store_matches(session, account)
        session.flush()
        _recalculate_duo_entries(session, user.id)
        session.commit()

    return ResponseMessage(message=f"Set account {game_name}#{tag_line}, fetched {stored} matches")


@duo_router.post("/account/update")
def update_account(
    user: User = Depends(require_creator),
) -> ResponseMessage:
    with get_db_session() as session:
        account = session.execute(
            select(DuoTrackedAccount).where(DuoTrackedAccount.owner_id == user.id)
        ).scalar_one_or_none()

        if not account:
            raise HTTPException(status_code=404, detail="No tracked account set")

        stored = _fetch_and_store_matches(session, account)
        session.flush()
        updated = _recalculate_duo_entries(session, user.id)
        session.commit()

    return ResponseMessage(message=f"Fetched {stored} new matches, updated {updated} duo entries")


@duo_router.post("/record")
def record_duo(
    request: RecordDuoRequest,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    with get_db_session() as session:
        normalized = name.strip().lower()
        wins = 0
        losses = 0
        matches = session.execute(
            select(DuoMatch).where(DuoMatch.owner_id == user.id)
        ).scalars().all()
        for m in matches:
            if normalized in m.teammates:
                if m.win:
                    wins += 1
                else:
                    losses += 1

        entry = DuoEntry(
            owner_id=user.id,
            name=None,
            wins=wins,
            losses=losses,
        )
        session.add(entry)
        session.flush()

        account = DuoEntryAccount(
            entry_id=entry.id,
            summoner_name=name,
        )
        session.add(account)
        session.commit()

    return ResponseMessage(message=f"Added duo partner {name} ({wins}-{losses})")


@duo_router.delete("/{entry_id}")
def delete_duo(
    entry_id: uuid.UUID,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    with get_db_session() as session:
        entry = session.execute(
            select(DuoEntry).where(
                DuoEntry.id == entry_id,
                DuoEntry.owner_id == user.id,
            )
        ).scalar_one_or_none()

        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        name = entry.display_name
        session.delete(entry)
        session.commit()
        return ResponseMessage(message=f"Deleted {name}")


@duo_router.put("/{entry_id}")
def update_duo(
    entry_id: uuid.UUID,
    request: UpdateDuoRequest,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    with get_db_session() as session:
        entry = session.execute(
            select(DuoEntry)
            .options(selectinload(DuoEntry.accounts))
            .where(
                DuoEntry.id == entry_id,
                DuoEntry.owner_id == user.id,
            )
        ).scalar_one_or_none()

        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        if request.name is not None:
            entry.name = request.name.strip() or None
        if request.note is not None:
            entry.note = request.note

        session.commit()
        return ResponseMessage(message=f"Updated {entry.display_name}")


@duo_router.post("/{entry_id}/account")
def add_entry_account(
    entry_id: uuid.UUID,
    request: AddAccountRequest,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    summoner_name = request.summoner_name.strip()
    if not summoner_name:
        raise HTTPException(status_code=400, detail="Summoner name cannot be empty")

    with get_db_session() as session:
        entry = session.execute(
            select(DuoEntry).where(
                DuoEntry.id == entry_id,
                DuoEntry.owner_id == user.id,
            )
        ).scalar_one_or_none()

        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        existing = session.execute(
            select(DuoEntryAccount).where(
                DuoEntryAccount.entry_id == entry_id,
                DuoEntryAccount.summoner_name == summoner_name,
            )
        ).scalar_one_or_none()

        if existing:
            raise HTTPException(status_code=409, detail=f"{summoner_name} already linked")

        session.add(DuoEntryAccount(entry_id=entry_id, summoner_name=summoner_name))
        session.flush()

        _recalculate_duo_entries(session, user.id)
        session.commit()

    return ResponseMessage(message=f"Added account {summoner_name}")


@duo_router.delete("/{entry_id}/account/{account_id}")
def remove_entry_account(
    entry_id: uuid.UUID,
    account_id: uuid.UUID,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    with get_db_session() as session:
        entry = session.execute(
            select(DuoEntry)
            .options(selectinload(DuoEntry.accounts))
            .where(
                DuoEntry.id == entry_id,
                DuoEntry.owner_id == user.id,
            )
        ).scalar_one_or_none()

        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        account = session.execute(
            select(DuoEntryAccount).where(
                DuoEntryAccount.id == account_id,
                DuoEntryAccount.entry_id == entry_id,
            )
        ).scalar_one_or_none()

        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        if len(entry.accounts) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last account")

        name = account.summoner_name
        session.delete(account)
        session.flush()

        _recalculate_duo_entries(session, user.id)
        session.commit()

    return ResponseMessage(message=f"Removed account {name}")
