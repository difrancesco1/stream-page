import string
import uuid

from sqlalchemy import String, ForeignKey, Enum
from sqlalchemy import LargeBinary
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from streampage.db.enums import Platform, SectionType


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
    user_reason: Mapped[str] = mapped_column(String(30))
    rank_when_added: Mapped[str | None] = mapped_column(String(50), nullable=True)