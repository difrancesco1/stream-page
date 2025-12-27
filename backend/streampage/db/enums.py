from enum import Enum as PyEnum


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


class MediaCategory(PyEnum):
    MOVIE = "movie"
    TV_SHOW = "tv_show"
    KDRAMA = "kdrama"
    ANIME = "anime"
    YOUTUBE = "youtube"

