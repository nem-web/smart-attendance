import motor.motor_asyncio
from app.core.config import settings

MONGO_URI = settings.MONGO_URI
MONGO_DB = "smart-attendance"


client = motor.motor_asyncio.AsyncIOMotorClient(
    MONGO_URI, serverSelectionTimeoutMS=5000
)
db = client[MONGO_DB]
