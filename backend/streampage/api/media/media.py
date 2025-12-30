from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException

from streampage.api.middleware.authenticator import get_current_user, get_optional_current_user, require_creator
from streampage.api.media.models import (
    AddMediaRequest,
    RemoveMediaRequest,
    EditMediaRequest,
    UpdateMediaRequest,
    UpvoteMediaRequest,
    SortMediaRequest,
    ResponseMessage,
    MediaResponse,
    MediaListResponse,
)
from streampage.db.engine import get_db_session
from streampage.db.models import Media, MediaUpvote, User


media_router = APIRouter()


def require_rosie(user: User) -> User:
    """Helper to check if the current user is rosie."""
    if user.username != "rosie":
        raise HTTPException(status_code=403, detail="Only rosie can perform this action")
    return user


@media_router.post("/add")
def add_media(
    request: AddMediaRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Add a new media entry (rosie only)."""
    require_rosie(user)
    
    with get_db_session() as session:
        # Get max display_order to add at the end
        max_order = session.query(Media).filter(
            Media.category == request.category
        ).count()

        entry = Media(
            category=request.category,
            name=request.name,
            info=request.info,
            url=request.url,
            display_order=max_order,
        )
        session.add(entry)
        session.commit()

        return ResponseMessage(message="Successfully added media")


@media_router.delete("/remove")
def remove_media(
    request: RemoveMediaRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Remove a media entry (rosie only)."""
    require_rosie(user)
    
    with get_db_session() as session:
        entry = session.query(Media).filter(Media.id == request.media_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Media not found")

        session.delete(entry)
        session.commit()

        return ResponseMessage(message="Successfully removed media")


@media_router.put("/edit")
def edit_media(
    request: EditMediaRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Edit a media entry (rosie only)."""
    require_rosie(user)
    
    with get_db_session() as session:
        entry = session.query(Media).filter(Media.id == request.media_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Media not found")

        # Update only provided fields
        if request.category is not None:
            entry.category = request.category
        if request.name is not None:
            entry.name = request.name
        if request.info is not None:
            entry.info = request.info
        if request.url is not None:
            entry.url = request.url

        session.commit()

        return ResponseMessage(message="Successfully updated media")


@media_router.post("/upvote")
def upvote_media(
    request: UpvoteMediaRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Toggle upvote on a media entry (any logged-in user)."""
    with get_db_session() as session:
        # Check if media exists
        media = session.query(Media).filter(Media.id == request.media_id).first()
        if not media:
            raise HTTPException(status_code=404, detail="Media not found")

        # Check if user already upvoted
        existing_upvote = session.query(MediaUpvote).filter(
            MediaUpvote.media_id == request.media_id,
            MediaUpvote.user_id == user.id,
        ).first()

        if existing_upvote:
            # Remove upvote (toggle off)
            session.delete(existing_upvote)
            session.commit()
            return ResponseMessage(message="Upvote removed")
        else:
            # Add upvote
            upvote = MediaUpvote(
                media_id=media.id,
                user_id=user.id,
            )
            session.add(upvote)
            session.commit()
            return ResponseMessage(message="Upvote added")


@media_router.get("/list")
def get_media_list(
    category: Optional[str] = None,
    user: Optional[User] = Depends(get_optional_current_user),
) -> MediaListResponse:
    """Get all media entries, optionally filtered by category."""
    with get_db_session() as session:
        query = session.query(Media)
        
        if category:
            query = query.filter(Media.category == category)
        
        entries = query.order_by(Media.display_order).all()

        # Get the set of media IDs the current user has upvoted
        user_upvoted_media_ids = set()
        if user:
            user_upvotes = session.query(MediaUpvote.media_id).filter(
                MediaUpvote.user_id == user.id
            ).all()
            user_upvoted_media_ids = {upvote.media_id for upvote in user_upvotes}

        media_list = []
        for entry in entries:
            # Count upvotes
            upvote_count = len(entry.upvotes)
            # Check if current user has upvoted this media
            has_upvoted = entry.id in user_upvoted_media_ids

            media_list.append(
                MediaResponse(
                    id=str(entry.id),
                    category=entry.category.value,
                    name=entry.name,
                    info=entry.info,
                    url=entry.url,
                    display_order=entry.display_order,
                    upvote_count=upvote_count,
                    user_has_upvoted=has_upvoted,
                )
            )

        return MediaListResponse(media=media_list)


@media_router.post("/sort")
def sort_media(
    request: SortMediaRequest,
    user=Depends(get_current_user),
) -> ResponseMessage:
    """Update the display order of media entries (rosie only)."""
    require_rosie(user)
    
    with get_db_session() as session:
        # Update display_order for each media item
        for index, media_id in enumerate(request.media_ids):
            entry = session.query(Media).filter(Media.id == media_id).first()
            if entry:
                entry.display_order = index

        session.commit()

        return ResponseMessage(message="Successfully sorted media")


@media_router.patch("/{media_id}")
def update_media(
    media_id: str,
    request: UpdateMediaRequest,
    user=Depends(require_creator),
) -> ResponseMessage:
    """Update a media entry's name and/or info. Only creator can update."""
    with get_db_session() as session:
        try:
            media_uuid = uuid.UUID(media_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid media ID format")
        
        entry = session.query(Media).filter(Media.id == media_uuid).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Media not found")
        
        # Update only provided fields
        if request.name is not None:
            entry.name = request.name
        if request.info is not None:
            entry.info = request.info
        
        session.commit()
        
        return ResponseMessage(message="Successfully updated media")


@media_router.delete("/{media_id}")
def delete_media(
    media_id: str,
    user=Depends(require_creator),
) -> ResponseMessage:
    """Delete a media entry. Only creator can delete."""
    with get_db_session() as session:
        try:
            media_uuid = uuid.UUID(media_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid media ID format")
        
        entry = session.query(Media).filter(Media.id == media_uuid).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Media not found")
        
        session.delete(entry)
        session.commit()
        
        return ResponseMessage(message="Successfully deleted media")

