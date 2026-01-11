from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pathlib import Path
import uuid

from streampage.api.middleware.authenticator import require_creator, get_optional_current_user
from streampage.api.page.models import ResponseMessage, PageConfigResponse
from streampage.db.engine import get_db_session
from streampage.db.models import User, PageConfig
from streampage.services.storage import storage_service


page_router = APIRouter()


@page_router.post("/background")
async def upload_background_image(
    file: UploadFile = File(...),
    user=Depends(require_creator),
) -> ResponseMessage:
    """Upload a new background image. Only creator can upload."""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Must be jpg, png, gif, or webp"
        )
    
    # Get file extension
    file_extension = Path(file.filename).suffix if file.filename else ".jpg"
    
    # Read file content
    contents = await file.read()
    
    # Upload to Supabase
    public_url = storage_service.upload_image(contents, "backgrounds", file_extension)
    
    # Update page config in database
    with get_db_session() as session:
        config = session.query(PageConfig).filter(PageConfig.owner_id == user.id).first()
        
        if config:
            # Delete old background from Supabase if it exists
            if config.background_image and "supabase.co" in config.background_image:
                storage_service.delete_image(config.background_image)
            
            config.background_image = public_url
        else:
            config = PageConfig(
                owner_id=user.id,
                background_image=public_url
            )
            session.add(config)
        
        session.commit()
    
    return ResponseMessage(message=public_url)


@page_router.get("/config")
def get_page_config(
    user=Depends(get_optional_current_user),
) -> PageConfigResponse:
    """Get page configuration. Available to all users."""
    with get_db_session() as session:
        # Find rosie (hardcoded page owner)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")
        
        config = session.query(PageConfig).filter(PageConfig.owner_id == rosie_user.id).first()
        
        if config:
            return PageConfigResponse(
                owner_id=str(config.owner_id),
                background_image=config.background_image
            )
        else:
            # Return default config
            return PageConfigResponse(
                owner_id=str(rosie_user.id),
                background_image=None
            )