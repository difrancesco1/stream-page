import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func

from streampage.api.first.models import (
    RecordFirstRequest,
    UpdateFirstRequest,
    FirstEntryResponse,
    FirstListResponse,
    ResponseMessage,
)
from streampage.api.middleware.authenticator import require_creator
from streampage.db.engine import get_db_session
from streampage.db.models import FirstEntry, User


first_router = APIRouter()


def _get_rosie_id() -> uuid.UUID:
    with get_db_session() as session:
        rosie = session.execute(
            select(User).where(User.username == "rosie")
        ).scalar_one_or_none()
        if not rosie:
            raise HTTPException(status_code=500, detail="Rosie user not found")
        return rosie.id


@first_router.get("/list")
def list_firsts() -> FirstListResponse:
    owner_id = _get_rosie_id()

    with get_db_session() as session:
        entries = session.execute(
            select(FirstEntry)
            .where(FirstEntry.owner_id == owner_id)
            .order_by(FirstEntry.first_count.desc())
        ).scalars().all()

        since_dt = session.execute(
            select(func.min(FirstEntry.created_at))
            .where(FirstEntry.owner_id == owner_id)
        ).scalar()

    since_str = f"{since_dt.month}/{since_dt.day}/{since_dt.year}" if since_dt else None

    return FirstListResponse(
        entries=[
            FirstEntryResponse(
                id=str(e.id),
                name=e.name,
                first_count=e.first_count,
                created_at=e.created_at,
            )
            for e in entries
        ],
        since=since_str,
    )


@first_router.post("/record")
def record_first(
    request: RecordFirstRequest,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    with get_db_session() as session:
        existing = session.execute(
            select(FirstEntry).where(
                FirstEntry.owner_id == user.id,
                FirstEntry.name == name,
            )
        ).scalar_one_or_none()

        if existing:
            existing.first_count += 1
            session.commit()
            return ResponseMessage(message=f"Incremented {name} to {existing.first_count}")

        entry = FirstEntry(owner_id=user.id, name=name)
        session.add(entry)
        session.commit()
        return ResponseMessage(message=f"Recorded first for {name}")


@first_router.delete("/{entry_id}")
def delete_first(
    entry_id: uuid.UUID,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    with get_db_session() as session:
        entry = session.execute(
            select(FirstEntry).where(
                FirstEntry.id == entry_id,
                FirstEntry.owner_id == user.id,
            )
        ).scalar_one_or_none()

        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        session.delete(entry)
        session.commit()
        return ResponseMessage(message=f"Deleted {entry.name}")


@first_router.put("/{entry_id}")
def update_first(
    entry_id: uuid.UUID,
    request: UpdateFirstRequest,
    user: User = Depends(require_creator),
) -> ResponseMessage:
    with get_db_session() as session:
        entry = session.execute(
            select(FirstEntry).where(
                FirstEntry.id == entry_id,
                FirstEntry.owner_id == user.id,
            )
        ).scalar_one_or_none()

        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        if request.name is not None:
            entry.name = request.name.strip()
        if request.first_count is not None:
            if request.first_count < 0:
                raise HTTPException(status_code=400, detail="Count cannot be negative")
            entry.first_count = request.first_count

        session.commit()
        return ResponseMessage(message=f"Updated {entry.name}")
