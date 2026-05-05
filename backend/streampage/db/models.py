import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, Enum, Integer, DateTime, Boolean, Text, Numeric
from sqlalchemy import LargeBinary, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from sqlalchemy import UniqueConstraint, Index

from streampage.db.enums import Platform, MediaCategory, QuestionType, ProductCategory, ProductMediaType, OrderStatus


class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
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

    # Relationship to summoner data
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

    # Relationship to summoner data
    summoner_data: Mapped["SummonerData"] = relationship(
        "SummonerData",
        foreign_keys="[OpggEntry.puuid]",
        primaryjoin="OpggEntry.puuid == SummonerData.puuid",
        uselist=False,
        viewonly=True,
    )


class SummonerData(Base):
    """Stored Riot API data for a summoner, keyed by PUUID."""
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
    contributor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("user.id"), nullable=True)

    # Relationship to upvotes
    upvotes: Mapped[list["MediaUpvote"]] = relationship(
        "MediaUpvote",
        back_populates="media",
        cascade="all, delete-orphan",
    )
    
    # Relationship to contributor
    contributor: Mapped["User"] = relationship(
        "User",
        foreign_keys=[contributor_id],
        viewonly=True
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


class PageConfig(Base):
    """Configuration for the page (background, theme, etc.)."""
    __tablename__ = "page_config"
    
    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), unique=True)
    background_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Form(Base):
    """A user-created form (Google Forms-like)."""
    __tablename__ = "form"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True)
    email_notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    creator: Mapped["User"] = relationship(
        "User", foreign_keys=[creator_id], viewonly=True
    )
    questions: Mapped[list["FormQuestion"]] = relationship(
        "FormQuestion",
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="FormQuestion.display_order",
    )
    responses: Mapped[list["FormResponse"]] = relationship(
        "FormResponse",
        back_populates="form",
        cascade="all, delete-orphan",
    )


class FormQuestion(Base):
    """A single question within a form."""
    __tablename__ = "form_question"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("form.id", ondelete="CASCADE")
    )
    question_text: Mapped[str] = mapped_column(String(500))
    question_type: Mapped[QuestionType] = mapped_column(Enum(QuestionType))
    options: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    form: Mapped["Form"] = relationship("Form", back_populates="questions")
    answers: Mapped[list["FormAnswer"]] = relationship(
        "FormAnswer",
        back_populates="question",
        cascade="all, delete-orphan",
    )


class FormResponse(Base):
    """A single user's submission to a form."""
    __tablename__ = "form_response"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("form.id", ondelete="CASCADE")
    )
    respondent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    form: Mapped["Form"] = relationship("Form", back_populates="responses")
    respondent: Mapped["User"] = relationship(
        "User", foreign_keys=[respondent_id], viewonly=True
    )
    answers: Mapped[list["FormAnswer"]] = relationship(
        "FormAnswer",
        back_populates="response",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("form_id", "respondent_id", name="uq_form_response_form_respondent"),
    )


class FormAnswer(Base):
    """A single answer to a question within a response."""
    __tablename__ = "form_answer"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    response_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("form_response.id", ondelete="CASCADE")
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("form_question.id", ondelete="CASCADE")
    )
    answer_value: Mapped[dict | list | str | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    response: Mapped["FormResponse"] = relationship("FormResponse", back_populates="answers")
    question: Mapped["FormQuestion"] = relationship("FormQuestion", back_populates="answers")


class FirstEntry(Base):
    """Tracks 'first in stream' counts per viewer for a page owner."""
    __tablename__ = "first_entry"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    name: Mapped[str] = mapped_column(String(100))
    first_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("owner_id", "name", name="uq_first_entry_owner_name"),
    )


class DuoTrackedAccount(Base):
    """The owner's Riot account used to fetch match history for duo tracking."""
    __tablename__ = "duo_tracked_account"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), unique=True)
    puuid: Mapped[str] = mapped_column(String)
    game_name: Mapped[str] = mapped_column(String(100))
    tag_line: Mapped[str] = mapped_column(String(10))
    last_updated: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class DuoMatch(Base):
    """A stored ranked match from the owner's match history."""
    __tablename__ = "duo_match"

    match_id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), primary_key=True)
    win: Mapped[bool] = mapped_column(Boolean)
    teammates: Mapped[list] = mapped_column(JSONB)
    played_at: Mapped[datetime] = mapped_column(DateTime)


class DuoEntry(Base):
    """Tracks duo partners and their game results for a page owner."""
    __tablename__ = "duo_entry"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    accounts: Mapped[list["DuoEntryAccount"]] = relationship(
        "DuoEntryAccount",
        back_populates="entry",
        cascade="all, delete-orphan",
        order_by="DuoEntryAccount.summoner_name",
    )

    @property
    def display_name(self) -> str:
        if self.name:
            return self.name
        if self.accounts:
            return self.accounts[0].summoner_name
        return "unknown"


class DuoEntryAccount(Base):
    """A summoner account linked to a duo entry for match tracking."""
    __tablename__ = "duo_entry_account"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entry_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("duo_entry.id", ondelete="CASCADE")
    )
    summoner_name: Mapped[str] = mapped_column(String(100))

    entry: Mapped["DuoEntry"] = relationship("DuoEntry", back_populates="accounts")

    __table_args__ = (
        UniqueConstraint("entry_id", "summoner_name", name="uq_duo_entry_account_entry_name"),
    )


class Product(Base):
    __tablename__ = "product"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category: Mapped[ProductCategory] = mapped_column(Enum(ProductCategory))
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    media: Mapped[list["ProductMedia"]] = relationship(
        "ProductMedia",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductMedia.display_order, ProductMedia.created_at",
    )


class ProductMedia(Base):
    """Image or video asset attached to a product.

    A product can have many media items. At most one row per product may have
    is_featured=True (enforced by a partial unique index). Ordering follows
    display_order ascending, ties broken by created_at.
    """
    __tablename__ = "product_media"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("product.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(500))
    media_type: Mapped[ProductMediaType] = mapped_column(Enum(ProductMediaType))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    product: Mapped["Product"] = relationship("Product", back_populates="media")

    __table_args__ = (
        Index(
            "ux_product_media_one_featured",
            "product_id",
            unique=True,
            postgresql_where=text("is_featured"),
        ),
    )


class Order(Base):
    __tablename__ = "order"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    paypal_order_id: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(
            OrderStatus,
            name="orderstatus",
            values_callable=lambda enum_cls: [m.value for m in enum_cls],
        ),
        default=OrderStatus.PENDING,
    )
    customer_first_name: Mapped[str] = mapped_column(String(100))
    customer_last_name: Mapped[str] = mapped_column(String(100))
    customer_email: Mapped[str] = mapped_column(String(254))
    customer_phone: Mapped[str] = mapped_column(String(30))
    shipping_street: Mapped[str] = mapped_column(String(300))
    shipping_city: Mapped[str] = mapped_column(String(100))
    shipping_state: Mapped[str] = mapped_column(String(100))
    shipping_zip: Mapped[str] = mapped_column(String(20))
    shipping_country: Mapped[str] = mapped_column(String(100))
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2))
    tracking_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tracking_carrier: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tracking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_item"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("order.id", ondelete="CASCADE")
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("product.id")
    )
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2))

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product", viewonly=True)