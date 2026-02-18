import os
import certifi
import motor.motor_asyncio
from pymongo.server_api import ServerApi
from app.core.config import settings

MONGO_URI = settings.MONGO_URI
MONGO_DB = os.getenv("MONGO_DB_NAME", "smart-attendance")


client = motor.motor_asyncio.AsyncIOMotorClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000,
    tlsCAFile=certifi.where(),
    server_api=ServerApi("1"),
)
db = client[MONGO_DB]
