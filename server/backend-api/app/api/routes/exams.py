"""
Exam days management API routes.

Exams are stored in a dedicated `exams` collection.
Each exam document looks like:

    {
        "_id": ObjectId,
        "teacher_id": ObjectId,       # owner teacher
        "date": "2026-03-15",         # ISO date string
        "name": "Maths Final",        # display name
        "createdAt": datetime,
        "updatedAt": datetime
    }

Endpoints:
    GET    /schedule/exams              - Fetch all exams for the teacher
    POST   /schedule/exams              - Add a new exam
    PUT    /schedule/exams/{exam_id}    - Update an exam by its _id
    DELETE /schedule/exams/{exam_id}    - Remove an exam by its _id
"""

from bson import ObjectId
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Body

from app.api.deps import get_current_teacher
from app.db.mongo import db
from app.schemas.exam import (
    ExamCreate,
    ExamUpdate,
    ExamResponse,
    ExamListResponse,
)

router = APIRouter(prefix="/schedule/exams", tags=["exams"])


# ─── helpers ─────────────────────────────────────────────────────────


def _doc_to_response(doc: dict) -> ExamResponse:
    """Convert a MongoDB document to a ExamResponse."""
    return ExamResponse(
        id=str(doc["_id"]),
        date=doc["date"],
        name=doc["name"],
        createdAt=doc.get("createdAt", datetime.min),
        updatedAt=doc.get("updatedAt", datetime.min),
    )


# ─── GET /schedule/exams ─────────────────────────────────────────


@router.get("", response_model=ExamListResponse)
async def get_exams(current: dict = Depends(get_current_teacher)):
    """Return all exams for the authenticated teacher, sorted by date."""
    teacher = current["teacher"]
    teacher_oid = teacher["_id"]

    cursor = db.exams.find({"teacher_id": teacher_oid}).sort("date", 1)
    exams = [_doc_to_response(doc) async for doc in cursor]

    return ExamListResponse(exams=exams)


# ─── POST /schedule/exams ────────────────────────────────────────


@router.post(
    "",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_exam(
    payload: ExamCreate,
    current: dict = Depends(get_current_teacher),
):
    """Add an exam. Duplicate dates for the same teacher are rejected (409)."""
    teacher = current["teacher"]
    teacher_oid = teacher["_id"]
    date_str = payload.date.isoformat()

    # Check for duplicate date (optional: if multiple exams can be on same day, remove this check)
    # The requirement says "Override schedule for exams". Usually implies the WHOLE day is an exam day.
    # So checking for duplicate date makes sense if it's an "Exam Day" concept.
    # However, user example: "Maths Final". What if "Physics Final" is in the afternoon?
    # The requirement says "Exams must override the regular schedule".
    # If it overrides the schedule, it means no classes.
    # So treating it as a "Day Type" (Exam Day) makes sense, usually one per day.

    existing = await db.exams.find_one({"teacher_id": teacher_oid, "date": date_str})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An exam entry already exists on {date_str}",
        )

    now = datetime.utcnow()
    doc = {
        "teacher_id": teacher_oid,
        "date": date_str,
        "name": payload.name.strip(),
        "createdAt": now,
        "updatedAt": now,
    }

    result = await db.exams.insert_one(doc)
    doc["_id"] = result.inserted_id

    return _doc_to_response(doc)


# ─── PUT /schedule/exams/:id ────────────────────────────────────


@router.put(
    "/{exam_id}",
    response_model=ExamResponse,
)
async def update_exam(
    exam_id: str,
    payload: ExamUpdate,
    current: dict = Depends(get_current_teacher),
):
    """Update an existing exam."""
    teacher = current["teacher"]
    teacher_oid = teacher["_id"]
    
    if not ObjectId.is_valid(exam_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid exam ID",
        )

    date_str = payload.date.isoformat()
    
    # Check if we are moving the exam to a date that already has an exam (and it's not THIS exam)
    existing_date = await db.exams.find_one({
        "teacher_id": teacher_oid, 
        "date": date_str,
        "_id": {"$ne": ObjectId(exam_id)}
    })
    
    if existing_date:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Another exam entry already exists on {date_str}",
        )

    now = datetime.utcnow()
    update_result = await db.exams.update_one(
        {"_id": ObjectId(exam_id), "teacher_id": teacher_oid},
        {"$set": {"date": date_str, "name": payload.name.strip(), "updatedAt": now}}
    )

    if update_result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )
        
    updated_doc = await db.exams.find_one({"_id": ObjectId(exam_id)})
    return _doc_to_response(updated_doc)


# ─── DELETE /schedule/exams/:id ──────────────────────────────────


@router.delete(
    "/{exam_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_exam(
    exam_id: str,
    current: dict = Depends(get_current_teacher),
):
    """Remove an exam by ID."""
    teacher = current["teacher"]
    teacher_oid = teacher["_id"]

    if not ObjectId.is_valid(exam_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid exam ID",
        )

    result = await db.exams.delete_one({"_id": ObjectId(exam_id), "teacher_id": teacher_oid})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found",
        )

    return None
