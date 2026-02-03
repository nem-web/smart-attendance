from datetime import datetime,UTC
from bson import ObjectId
from app.db.mongo import db

COLLECTION = "subjects"

async def ensure_indexes():
    await db[COLLECTION].create_index("code", unique=True)
    await db[COLLECTION].create_index("professor_ids")
    
async def get_subject_by_code(code: str):
    return await db[COLLECTION].find_one({"code": code})

async def create_subject(name: str, code: str, professor_id: ObjectId):
    doc = {
        "name": name,
        "code": code,
        "professor_ids": [professor_id],
        "created_at": datetime.now(UTC)
    }
    
    res = await db[COLLECTION].insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc


async def add_professor_to_subject(subject_id: ObjectId, professor_id: ObjectId):
    await db[COLLECTION].update_one(
        {"_id": subject_id},
        {"$addToSet": {"professor_ids": professor_id}}
    )
    
    
async def get_subjects_by_ids(ids):
    if not ids:
        return []
    obj_ids = [ObjectId(i) if isinstance(i, str) else i for i in ids]
    cursor = db.subjects.find(
        {"_id": {"$in": obj_ids}},
        {"name": 1, "code": 1}
    )
    return await cursor.to_list(length=None)
    