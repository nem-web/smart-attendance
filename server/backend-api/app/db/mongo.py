import motor.motor_asyncio
from app.core.config import settings

MONGO_URI = settings.MONGO_URI
MONGO_DB = "smart-attendance" 

print(f"Connecting to MONGO_URI: {MONGO_URI}")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[MONGO_DB]
