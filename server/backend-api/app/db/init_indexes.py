import os
from urllib.parse import urlparse
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)

async def create_indexes():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db_name = urlparse(settings.MONGO_URI).path.lstrip("/") or os.getenv("MONGO_DB_NAME", "smart-attendance")
    db = client[db_name]
    
    try:
        await db.refresh_tokens.create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="refresh_token_ttl"
        )
        logger.info("Created TTL index on refresh_tokens.expires_at")
        
        await db.refresh_tokens.create_index(
            [("user_id", 1), ("session_id", 1)],
            name="user_session_idx"
        )
        logger.info("Created compound index on refresh_tokens (user_id, session_id)")
        
        await db.refresh_tokens.create_index(
            "token_hash",
            unique=True,
            name="token_hash_unique"
        )
        logger.info("Created unique index on refresh_tokens.token_hash")
        
    except Exception as e:
        logger.error(f"Error creating indexes: {e}", exc_info=True)
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_indexes())
