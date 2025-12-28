import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, Enum, Integer, DateTime
from sqlalchemy import LargeBinary
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from sqlalchemy import UniqueConstraint

from streampage.db.enums import Platform, SectionType, MediaCategory


class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True)
    display_name: Mapped[str | None]
    birthday: Mapped[str | None]
    profile_picture: Mapped[str | None]  # URL stored as string

    # Relationships
    logins: Mapped[list["UserLogin"]] = relationship(back_populates="user")
    biography: Mapped["Biography"] = relationship(back_populates="user")
    socials: Mapped[list["Social"]] = relationship(back_populates="user")
    favorite_champions: Mapped["FavoriteChampions"] = relationship(back_populates="user")
    featured_images: Mapped["FeaturedImages"] = relationship(back_populates="user")
    card_config: Mapped["CardConfig"] = relationship(back_populates="user")

class UserLogin(Base):

    __tablename__ = "UserLogin"

    # Primary Key
    username: Mapped[str] = mapped_column(primary_key=True, unique=True)

    # Foreign Keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )

    # Data
    password: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    # Relationship mapping
    user: Mapped["User"] = relationship("User", back_populates="logins")

    def __init__(self, user: User, password: bytes):
        self.user_id = user.id
        self.username = user.username
        self.password = password

class Biography(Base):
    __tablename__ = "biography"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    content: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    user: Mapped["User"] = relationship(back_populates="biography")


class Social(Base):
    """One row per platform per user"""
    __tablename__ = "socials"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    platform: Mapped[Platform] = mapped_column(Enum(Platform))
    url: Mapped[str]

    user: Mapped["User"] = relationship(back_populates="socials")


class FeaturedImages(Base):
    __tablename__ = "featured_images"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    images: Mapped[list[str]] = mapped_column(ARRAY(String))

    user: Mapped["User"] = relationship(back_populates="featured_images")

class FavoriteChampions(Base):
    __tablename__ = "favorite_champions"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    champions: Mapped[list[str]] = mapped_column(ARRAY(String))

    user: Mapped["User"] = relationship(back_populates="favorite_champions")


class CardConfig(Base):
    __tablename__ = "card_config"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    sections: Mapped[list[str]] = mapped_column(ARRAY(String))

    user: Mapped["User"] = relationship(back_populates="card_config")

class IntListEntry(Base):
    __tablename__ = "int_list_entry"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    page_owner_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("user.id"), nullable=True)
    contributor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    puuid: Mapped[str] = mapped_column(unique=True)
    summoner_name: Mapped[str]
    summoner_tag: Mapped[str]
    user_reason: Mapped[str]
    rank_when_added: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationship to cached summoner data
    summoner_data: Mapped["SummonerData"] = relationship(
        "SummonerData",
        foreign_keys="[IntListEntry.puuid]",
        primaryjoin="IntListEntry.puuid == SummonerData.puuid",
        uselist=False,
        viewonly=True,
    )


class OpggEntry(Base):
    """Tracks accounts added to the OPGG card for a page owner."""
    __tablename__ = "opgg_entry"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    contributor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("user.id"), nullable=True)
    puuid: Mapped[str] = mapped_column(String, unique=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship to cached summoner data
    summoner_data: Mapped["SummonerData"] = relationship(
        "SummonerData",
        foreign_keys="[OpggEntry.puuid]",
        primaryjoin="OpggEntry.puuid == SummonerData.puuid",
        uselist=False,
        viewonly=True,
    )


class SummonerData(Base):
    """Cached Riot API data for a summoner, keyed by PUUID."""
    __tablename__ = "summoner_data"

    # Primary key - the unique Riot PUUID
    puuid: Mapped[str] = mapped_column(String, primary_key=True)
    
    # Summoner identity (can change over time, so we track latest)
    game_name: Mapped[str] = mapped_column(String(100))
    tag_line: Mapped[str] = mapped_column(String(10))
    
    # Ranked Solo/Duo data
    tier: Mapped[str | None] = mapped_column(String(20), nullable=True)  # DIAMOND, MASTER, GRANDMASTER, etc.
    rank: Mapped[str | None] = mapped_column(String(5), nullable=True)   # I, II, III, IV
    league_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wins: Mapped[int | None] = mapped_column(Integer, nullable=True)
    losses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Recent match history (stored as JSONB for efficient querying)
    # Format: [{"match_id": str, "champion_id": int, "champion_name": str, "win": bool, ...}, ...]
    recent_matches: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    
    # Cache metadata
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class HiddenMatch(Base):
    """Tracks matches that have been hidden by the page owner."""
    __tablename__ = "hidden_match"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    match_id: Mapped[str] = mapped_column(String, index=True)  # Riot match ID (e.g., "NA1_123456789")


class Media(Base):
    """Media entries for movies, TV shows, kdramas, anime, and YouTube."""
    __tablename__ = "media"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category: Mapped[MediaCategory] = mapped_column(Enum(MediaCategory))
    name: Mapped[str] = mapped_column(String(200))
    info: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship to upvotes
    upvotes: Mapped[list["MediaUpvote"]] = relationship(
        "MediaUpvote",
        back_populates="media",
        cascade="all, delete-orphan",
    )


class MediaUpvote(Base):
    """Tracks which users have upvoted which media entries."""
    __tablename__ = "media_upvote"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"))

    # Relationships
    media: Mapped["Media"] = relationship("Media", back_populates="upvotes")

    __table_args__ = (
        UniqueConstraint("media_id", "user_id", name="uq_media_upvote_media_user"),
    )


class CatEntry(Base):
    """Cat pictures uploaded by users."""
    __tablename__ = "cat_entry"
    
    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))  # Always rosie
    contributor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))  # Who uploaded
    image_url: Mapped[str] = mapped_column(String(500))  # Relative path to image file
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    contributor: Mapped["User"] = relationship(
        "User", 
        foreign_keys=[contributor_id],
        viewonly=True
    )