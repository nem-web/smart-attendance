import asyncio
import os
import sys
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Ensure we can import from app if needed, but standalone script is safer
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "smart_attendance")

async def migrate_schedule():
    print(f"Connecting to {MONGO_URI} / {DB_NAME}")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    collection = db["schedules"]
    
    # Fetch all documents
    cursor = collection.find({})
    to_migrate = []
    
    async for doc in cursor:
        # Check if already migrated
        if "weekly_schedule" in doc:
            continue
            
        # Check if it's a flat document (has 'day', 'slot')
        if "day" in doc and "slot" in doc:
            to_migrate.append(doc)
            
    if not to_migrate:
        print("No documents to migrate.")
        return

    print(f"Found {len(to_migrate)} flat documents to migrate.")
    
    # Group by (subject_id, teacher_id)
    grouped = {} 
    
    deleted_ids = []
    
    for doc in to_migrate:
        subject_id = doc.get("subject_id")
        teacher_id = doc.get("teacher_id")
        subject_name = doc.get("subject_name")
        
        if not subject_id or not teacher_id:
            print(f"Skipping doc {doc.get('_id')} due to missing subject_id or teacher_id")
            continue
            
        key = (str(subject_id), str(teacher_id))
        
        if key not in grouped:
            grouped[key] = {
                "subject_id": subject_id,
                "teacher_id": teacher_id,
                "subject_name": subject_name,
                "weekly_schedule": []
            }
            
        slot_entry = {
            "slot_id": str(uuid4()),
            "day": doc.get("day"),
            "slot": doc.get("slot", 0),
            "start_time": doc.get("start_time", ""),
            "end_time": doc.get("end_time", ""),
            "room": doc.get("room"),
            "tracked": doc.get("tracked", True)
        }
        
        grouped[key]["weekly_schedule"].append(slot_entry)
        deleted_ids.append(doc["_id"])
        
    # Insert new documents
    new_docs = list(grouped.values())
    if new_docs:
        print(f"Inserting {len(new_docs)} new subject-grouped documents...")
        await collection.insert_many(new_docs)
        
    # Delete old documents
    if deleted_ids:
        print(f"Deleting {len(deleted_ids)} old flat documents...")
        await collection.delete_many({"_id": {"$in": deleted_ids}})
        
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate_schedule())
