import motor.motor_asyncio
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

MONGO_URI = settings.MONGO_URI
MONGO_DB = "smart-attendance"

logger.info(f"Connecting to MongoDB...")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[MONGO_DB]
