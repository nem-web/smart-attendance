"""
Holiday management API routes.

Holidays are stored in a dedicated `holidays` collection (per issue #315),
decoupled from the teacher document. Each holiday document looks like:

    {
        "_id": ObjectId,
        "teacher_id": ObjectId,       # owner teacher
        "date": "2026-01-26",         # ISO date string
        "name": "Republic Day"        # display name
    }

Endpoints:
    GET    /schedule/holidays              - Fetch all holidays for the teacher
    POST   /schedule/holidays              - Add a new holiday
    DELETE /schedule/holidays/{holiday_id} - Remove a holiday by its _id
"""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_teacher
from app.db.mongo import db
from app.schemas.holiday import (
    HolidayCreate,
    HolidayResponse,
    HolidayListResponse,
    MessageResponse,
)

router = APIRouter(prefix="/schedule/holidays", tags=["holidays"])


# ─── helpers ─────────────────────────────────────────────────────────

def _doc_to_response(doc: dict) -> HolidayResponse:
    """Convert a MongoDB document to a HolidayResponse."""
    return HolidayResponse(
        id=str(doc["_id"]),
        date=doc["date"],
        name=doc["name"],
    )


# ─── GET /schedule/holidays ─────────────────────────────────────────

@router.get("", response_model=HolidayListResponse)
async def get_holidays(current: dict = Depends(get_current_teacher)):
    """Return all holidays for the authenticated teacher, sorted by date."""
    teacher = current["teacher"]
    teacher_oid = teacher["_id"]

    cursor = db.holidays.find({"teacher_id": teacher_oid}).sort("date", 1)
    holidays = [_doc_to_response(doc) async for doc in cursor]

    return HolidayListResponse(holidays=holidays)


# ─── POST /schedule/holidays ────────────────────────────────────────

@router.post(
    "",
    response_model=HolidayResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_holiday(
    payload: HolidayCreate,
    current: dict = Depends(get_current_teacher),
):
    """Add a holiday. Duplicate dates for the same teacher are rejected (409)."""
    teacher = current["teacher"]
    teacher_oid = teacher["_id"]
    date_str = payload.date.isoformat()

    # Check for duplicate date
    existing = await db.holidays.find_one(
        {"teacher_id": teacher_oid, "date": date_str}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A holiday already exists on {date_str}",
        )

    doc = {
        "teacher_id": teacher_oid,
        "date": date_str,
        "name": payload.name.strip(),
    }

    result = await db.holidays.insert_one(doc)
    doc["_id"] = result.inserted_id

    return _doc_to_response(doc)


# ─── DELETE /schedule/holidays/:id ──────────────────────────────────

@router.delete("/{holiday_id}", response_model=MessageResponse)
async def delete_holiday(
    holiday_id: str,
    current: dict = Depends(get_current_teacher),
):
    """Remove a holiday by its _id. Only the owning teacher can delete."""
    teacher = current["teacher"]
    teacher_oid = teacher["_id"]

    # Validate ObjectId format
    if not ObjectId.is_valid(holiday_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid holiday ID format",
        )

    result = await db.holidays.delete_one(
        {"_id": ObjectId(holiday_id), "teacher_id": teacher_oid}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found",
        )

    return MessageResponse(message="Holiday deleted successfully")