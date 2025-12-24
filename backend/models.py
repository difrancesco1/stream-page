import uuid
from enum import Enum as PyEnum

from sqlalchemy import String, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Platform(PyEnum):
    TWITTER = "twitter"
    TWITCH = "twitch"
    YOUTUBE = "youtube"
    DISCORD = "discord"

class SectionType(PyEnum):
    BIOGRAPHY = "biography"
    SOCIALS = "socials"
    LEAGUE_CHAMPIONS = "league_champions"
    ART_ITEMS = "art_items"
    MYSELF = "myself"
class User(Base):
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password: Mapped[str]
    display_name: Mapped[str | None]
    birthday: Mapped[str | None]
    profile_picture: Mapped[str | None]  # URL stored as string

    # Relationships
    biography: Mapped["Biography"] = relationship(back_populates="user")
    socials: Mapped[list["Social"]] = relationship(back_populates="user")
    favorite_champions: Mapped["FavoriteChampions"] = relationship(back_populates="user")
    featured_images: Mapped["FeaturedImages"] = relationship(back_populates="user")
    card_config: Mapped["CardConfig"] = relationship(back_populates="user")


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