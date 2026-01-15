"""
Scheduled tasks for updating summoner data.
"""

import logging
import time

from streampage.db.engine import get_db_session
from streampage.db.models import IntListEntry
from streampage.db.riot import fetch_and_store_summoner_data

logger = logging.getLogger(__name__)


def update_all_int_list_entries(buffer_seconds: int = 10) -> None:
    """
    Update summoner data for all int list entries.
    
    Queries all unique PUUIDs from IntListEntry and refreshes their
    SummonerData records from the Riot API.
    
    Args:
        buffer_seconds: Time to wait between API calls to respect rate limits.
    """
    logger.info("Starting scheduled int list update...")
    
    with get_db_session() as session:
        # Get all int list entries with their summoner info
        entries = session.query(IntListEntry).all()
        
        if not entries:
            logger.info("No int list entries to update.")
            return
        
        total = len(entries)
        logger.info(f"Found {total} int list entries to update.")
        
        for i, entry in enumerate(entries, start=1):
            try:
                logger.info(
                    f"[{i}/{total}] Updating {entry.summoner_name}#{entry.summoner_tag}..."
                )
                
                fetch_and_store_summoner_data(
                    session,
                    entry.puuid,
                    entry.summoner_name,
                    entry.summoner_tag,
                )
                session.commit()
                
                logger.info(
                    f"[{i}/{total}] Successfully updated {entry.summoner_name}#{entry.summoner_tag}"
                )
                
            except Exception as e:
                logger.error(
                    f"[{i}/{total}] Failed to update {entry.summoner_name}#{entry.summoner_tag}: {e}"
                )
                session.rollback()
            
            # Buffer between API calls (skip on last entry)
            if i < total:
                time.sleep(buffer_seconds)
    
    logger.info("Scheduled int list update completed.")
