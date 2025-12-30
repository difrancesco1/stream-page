from fastapi import HTTPException
from fastapi import APIRouter
from fastapi import Depends
from fastapi import status
from fastapi import UploadFile, File
import os
import uuid as uuid_lib
from pathlib import Path

from streampage.api.middleware.authenticator import create_access_token, get_current_user, require_creator, get_optional_current_user
from streampage.api.user.auth import hash_password, verify_password
from streampage.api.user.models import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
    UpdateProfileRequest,
    UpdateSocialLinksRequest,
    ResponseMessage,
    PublicProfileResponse,
    SocialLinkResponse,
)
from streampage.db.enums import Platform
from streampage.db.engine import get_db_session
from streampage.db.models import User, UserLogin, Biography, Social, FeaturedImages

users_router = APIRouter()


@users_router.post("/register")
def register(request: RegisterRequest) -> UserResponse:
    """Register a new user with username and password."""
    with get_db_session() as session:
        # Check if username already exists
        existing_user = session.query(User).filter(User.username == request.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        # Create new user
        user = User(username=request.username)
        session.add(user)
        session.flush()  # Get the user ID

        # Create login entry with hashed password
        hashed_password = hash_password(request.password)
        user_login = UserLogin(user=user, password=hashed_password)
        session.add(user_login)
        session.commit()

        return UserResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            birthday=user.birthday,
            profile_picture=user.profile_picture,
        )


@users_router.post("/login")
def login(request: LoginRequest) -> LoginResponse:
    """Login with username and password, returns JWT token."""
    with get_db_session() as session:
        # Find user login
        user_login = (
            session.query(UserLogin)
            .filter(UserLogin.username == request.username)
            .first()
        )

        if not user_login:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify password
        if not verify_password(request.password, user_login.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create JWT token
        access_token, _ = create_access_token(user_login)

        return LoginResponse(access_token=access_token)


@users_router.get("/user")
def get_user_with_jwt(current_user=Depends(get_current_user)) -> UserResponse:
    """Get current user from JWT token."""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid JWT Token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        birthday=current_user.birthday,
        profile_picture=current_user.profile_picture,
    )


@users_router.get("/public-profile")
def get_public_profile(
    user=Depends(get_optional_current_user)
) -> PublicProfileResponse:
    """Get page owner's (rosie's) public profile. Available to all users."""
    with get_db_session() as session:
        # Find rosie (hardcoded page owner)
        rosie_user = session.query(User).filter(User.username == "rosie").first()
        if not rosie_user:
            raise HTTPException(status_code=404, detail="Page owner not found")
        
        # Get biography
        bio = session.query(Biography).filter(Biography.user_id == rosie_user.id).first()
        biography = bio.content if bio and bio.content else None
        
        # Get social links
        socials = session.query(Social).filter(Social.user_id == rosie_user.id).all()
        social_links = [
            SocialLinkResponse(platform=social.platform.value, url=social.url)
            for social in socials
        ] if socials else None
        
        # Get featured images (use first one if available)
        featured_images_entry = session.query(FeaturedImages).filter(
            FeaturedImages.user_id == rosie_user.id
        ).first()
        featured_image = (
            featured_images_entry.images[0] 
            if featured_images_entry and featured_images_entry.images 
            else None
        )
        
        return PublicProfileResponse(
            display_name=rosie_user.display_name,
            birthday=rosie_user.birthday,
            profile_picture=rosie_user.profile_picture,
            biography=biography,
            social_links=social_links,
            featured_image=featured_image,
        )


@users_router.put("/profile")
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(require_creator)
) -> UserResponse:
    """Update user profile. Only creator can update."""
    with get_db_session() as session:
        user = session.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user fields
        if request.display_name is not None:
            user.display_name = request.display_name
        if request.birthday is not None:
            user.birthday = request.birthday
        
        # Update biography if provided
        if request.biography is not None:
            bio = session.query(Biography).filter(Biography.user_id == user.id).first()
            if bio:
                bio.content = request.biography
            else:
                bio = Biography(user_id=user.id, content=request.biography)
                session.add(bio)
        
        session.commit()
        session.refresh(user)
        
        return UserResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            birthday=user.birthday,
            profile_picture=user.profile_picture,
        )


@users_router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(require_creator)
) -> ResponseMessage:
    """Upload a new profile picture. Only creator can upload."""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Must be jpg, png, gif, or webp"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/profile")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
    unique_filename = f"{uuid_lib.uuid4()}.{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Update user's profile_picture in database
    with get_db_session() as session:
        user = session.query(User).filter(User.id == current_user.id).first()
        if user:
            user.profile_picture = f"/uploads/profile/{unique_filename}"
            session.commit()
    
    return ResponseMessage(message="Profile picture uploaded successfully")


@users_router.post("/featured-image")
async def upload_featured_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_creator)
) -> ResponseMessage:
    """Upload a new featured image for the main card. Only creator can upload."""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} not allowed. Must be jpg, png, gif, or webp"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/featured")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
    unique_filename = f"{uuid_lib.uuid4()}.{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Store the URL in the FeaturedImages table
    image_url = f"/uploads/featured/{unique_filename}"
    with get_db_session() as session:
        featured_images = session.query(FeaturedImages).filter(
            FeaturedImages.user_id == current_user.id
        ).first()
        
        if featured_images:
            # Update existing entry - replace the first image
            featured_images.images = [image_url]
        else:
            # Create new entry
            featured_images = FeaturedImages(
                user_id=current_user.id,
                images=[image_url]
            )
            session.add(featured_images)
        
        session.commit()
    
    return ResponseMessage(message=image_url)


@users_router.put("/social-links")
def update_social_links(
    request: UpdateSocialLinksRequest,
    current_user: User = Depends(require_creator)
) -> ResponseMessage:
    """Update user's social links. Only creator can update."""
    
    # Validate platforms
    valid_platforms = {p.value for p in Platform}
    for link in request.social_links:
        if link.platform.lower() not in valid_platforms:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid platform: {link.platform}. Valid platforms: {', '.join(valid_platforms)}"
            )
    
    with get_db_session() as session:
        # Delete existing social links for the user
        session.query(Social).filter(Social.user_id == current_user.id).delete()
        
        # Add new social links
        for link in request.social_links:
            platform_enum = Platform(link.platform.lower())
            social = Social(
                user_id=current_user.id,
                platform=platform_enum,
                url=link.url
            )
            session.add(social)
        
        session.commit()
    
    return ResponseMessage(message="Social links updated successfully")
