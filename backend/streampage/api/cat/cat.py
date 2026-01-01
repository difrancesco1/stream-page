import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select

from streampage.api.middleware.authenticator import get_current_user
from streampage.api.cat.models import (
    RemoveCatRequest,
    ResponseMessage,
    CatResponse,
    CatListResponse,
)
from streampage.db.engine import get_db_session
from streampage.db.models import CatEntry, User
from streampage.services.storage import storage_service


cat_router = APIRouter()

# Allowed file extensions
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif"}


def get_rosie_user_id() -> uuid.UUID:
    """Get rosie's user ID from the database."""
    with get_db_session() as session:
        rosie = session.execute(
            select(User).where(User.username == "rosie")
        ).scalar_one_or_none()
        
        if not rosie:
            raise HTTPException(status_code=500, detail="Rosie user not found")
        
        return rosie.id


@cat_router.post("/add")
async def add_cat_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> ResponseMessage:
    """Upload a cat image (any authenticated user)."""
    
    # Validate file extension
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    contents = await file.read()
    
    # Upload to Supabase
    public_url = storage_service.upload_image(contents, "cats", file_ext)
    
    # Get rosie's user ID
    rosie_id = get_rosie_user_id()
    
    # Create database entry
    with get_db_session() as session:
        cat_entry = CatEntry(
            creator_id=rosie_id,
            contributor_id=user.id,
            image_url=public_url,
        )
        session.add(cat_entry)
        session.commit()
    
    return ResponseMessage(message="Successfully uploaded cat image")


@cat_router.delete("/remove")
def remove_cat_image(
    request: RemoveCatRequest,
    user: User = Depends(get_current_user),
) -> ResponseMessage:
    """Delete a cat image (rosie or contributor only)."""
    
    with get_db_session() as session:
        cat_entry = session.execute(
            select(CatEntry).where(CatEntry.id == request.cat_id)
        ).scalar_one_or_none()
        
        if not cat_entry:
            raise HTTPException(status_code=404, detail="Cat image not found")
        
        # Check permissions: rosie can delete any, contributors can delete their own
        if user.username != "rosie" and cat_entry.contributor_id != user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this image")
        
        # Delete file from Supabase Storage
        if "supabase.co" in cat_entry.image_url:
            storage_service.delete_image(cat_entry.image_url)
        
        # Delete database entry
        session.delete(cat_entry)
        session.commit()
    
    return ResponseMessage(message="Successfully deleted cat image")


@cat_router.get("/list")
def get_cat_images() -> CatListResponse:
    """Get all cat images with contributor information."""
    
    with get_db_session() as session:
        cat_entries = session.execute(
            select(CatEntry).order_by(CatEntry.created_at.desc())
        ).scalars().all()
        
        cats = []
        for entry in cat_entries:
            # Fetch contributor username
            contributor = session.execute(
                select(User).where(User.id == entry.contributor_id)
            ).scalar_one_or_none()
            
            if contributor:
                cats.append(
                    CatResponse(
                        id=str(entry.id),
                        image_url=entry.image_url,
                        contributor_username=contributor.username,
                        created_at=entry.created_at,
                    )
                )
        
        return CatListResponse(cats=cats)

