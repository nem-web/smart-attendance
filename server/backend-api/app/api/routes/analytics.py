"""
Analytics API routes for attendance data.
"""

from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.db.mongo import db
from app.schemas.analytics import SubjectStatsResponse, StudentStat

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# -------------------------------------------------------------------------
# HELPER FUNCTIONS (From Branch 304 - Security & Auth)
# -------------------------------------------------------------------------
def _get_teacher_oid(current_user: dict) -> ObjectId:
    if current_user.get("role") != "teacher":
        raise HTTPException(
            status_code=403, detail="Only teachers can access analytics"
        )

    try:
        return ObjectId(current_user["id"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")


async def _get_teacher_subjects(teacher_oid: ObjectId) -> list[dict]:
    subjects_cursor = db.subjects.find(
        {"professor_ids": teacher_oid},
        {"_id": 1, "name": 1, "code": 1},
    )
    return await subjects_cursor.to_list(length=1000)


async def _verify_teacher_class_access(
    teacher_oid: ObjectId, class_oid: ObjectId
) -> None:
    subject = await db.subjects.find_one(
        {"_id": class_oid, "professor_ids": teacher_oid},
        {"_id": 1},
    )
    if not subject:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this class",
        )


# -------------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------------

@router.get("/subject/{subject_id}", response_model=SubjectStatsResponse)
async def get_subject_analytics(
    subject_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get detailed analytics for a specific subject (context-aware leaderboards).
    """
    # Verify teacher
    if current_user["role"] != "teacher":
        raise HTTPException(
            status_code=403, detail="Only teachers can access subject analytics"
        )

    try:
        subject_oid = ObjectId(subject_id)
        teacher_oid = ObjectId(current_user["id"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # Fetch Subject
    subject = await db.subjects.find_one({"_id": subject_oid})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Verify Ownership
    if teacher_oid not in subject.get("professor_ids", []):
        raise HTTPException(
            status_code=403, detail="Not authorized to view this subject"
        )

    # Process Student Stats
    students_info = subject.get("students", [])
    if not students_info:
        return SubjectStatsResponse(
            attendance=0.0,
            avgLate=0,
            riskCount=0,
            lateTime="09:00 AM",
            bestPerforming=[],
            needsSupport=[],
        )

    # Fetch Student Names
    student_uids = [s["student_id"] for s in students_info if "student_id" in s]
    users_cursor = db.users.find({"_id": {"$in": student_uids}}, {"_id": 1, "name": 1})
    users_list = []
    async for u in users_cursor:
        users_list.append(u)

    users_map = {str(u["_id"]): u.get("name", "Unknown") for u in users_list}

    stats_list = []
    total_percentage = 0.0
    valid_students_count = 0
    risk_count = 0

    for s in students_info:
        sid_str = str(s.get("student_id"))
        attendance = s.get("attendance", {})
        present = attendance.get("present", 0)
        absent = attendance.get("absent", 0)
        total = present + absent

        if total == 0:
            percentage = 0.0
        else:
            percentage = (present / total) * 100.0

        current_student_stat = StudentStat(
            id=sid_str,
            name=users_map.get(sid_str, "Unknown"),
            score=round(percentage, 1),
        )
        stats_list.append(current_student_stat)

        if total > 0:
            total_percentage += percentage
            valid_students_count += 1

        if percentage < 75.0:
            risk_count += 1

    # Calculate Class Average
    if valid_students_count > 0:
        class_average = round(total_percentage / valid_students_count, 1)
    else:
        class_average = 0.0

    # Sort for Leaderboards
    # Best: High score desc
    best_performing = sorted(stats_list, key=lambda x: x.score, reverse=True)[:5]

    # Needs Support: Low score asc
    needs_support = sorted(stats_list, key=lambda x: x.score)[:5]

    return SubjectStatsResponse(
        attendance=class_average,
        avgLate=0,  # Placeholder
        riskCount=risk_count,
        lateTime="09:00 AM",  # Placeholder
        bestPerforming=best_performing,
        needsSupport=needs_support,
    )


@router.get("/attendance-trend")
async def get_attendance_trend(
    classId: str = Query(..., description="Class/Subject ID"),
    dateFrom: str = Query(..., description="Start date (YYYY-MM-DD)"),
    dateTo: str = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get attendance trend for a specific class within a date range.
    Returns daily attendance data including present, absent, late counts and percentage.
    """
    # 1. Auth Check (from 304)
    teacher_oid = _get_teacher_oid(current_user)

    # Validate dates
    try:
        start_date = datetime.fromisoformat(dateFrom)
        end_date = datetime.fromisoformat(dateTo)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
        )

    if start_date > end_date:
        raise HTTPException(status_code=400, detail="dateFrom must be before dateTo")

    # Validate classId
    try:
        class_oid = ObjectId(classId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid classId format")

    # 2. Ownership Check (from 304)
    await _verify_teacher_class_access(teacher_oid, class_oid)

    # 3. Data Retrieval (from main - assumes single doc with 'daily' map schema)
    doc = await db.attendance_daily.find_one({"subjectId": class_oid})

    trend_data = []

    if doc and "daily" in doc:
        daily_map = doc["daily"]
        for date_str, summary in daily_map.items():
            try:
                record_date = datetime.fromisoformat(date_str)
                if start_date <= record_date <= end_date:
                    trend_data.append(
                        {
                            "date": date_str,
                            "present": summary.get("present", 0),
                            "absent": summary.get("absent", 0),
                            "late": summary.get("late", 0),
                            "total": summary.get("total", 0),
                            "percentage": summary.get("percentage", 0.0),
                        }
                    )
            except ValueError:
                continue

    # Sort by date
    trend_data.sort(key=lambda x: x["date"])

    return {
        "classId": classId,
        "dateFrom": dateFrom,
        "dateTo": dateTo,
        "data": trend_data,
    }


@router.get("/monthly-summary")
async def get_monthly_summary(
    classId: Optional[str] = Query(
        None, description="Optional class/subject ID filter"
    ),
    current_user: dict = Depends(get_current_user),
):
    """
    Get monthly attendance summary aggregated by month.
    Can be filtered by classId or return all classes.
    """
    # 1. Auth & Get Subjects (from 304)
    teacher_oid = _get_teacher_oid(current_user)
    subjects = await _get_teacher_subjects(teacher_oid)
    subject_ids = [subject["_id"] for subject in subjects]

    if not subject_ids:
        return {"data": []}

    # Build match filter
    # Use 'subjectId' for DB match (from main schema), but check auth using 304 logic
    match_filter = {"subjectId": {"$in": subject_ids}}
    
    if classId:
        try:
            class_oid = ObjectId(classId)
            # Verify explicit access if specific class requested (from 304)
            await _verify_teacher_class_access(teacher_oid, class_oid)
            match_filter["subjectId"] = class_oid
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid classId format")

    # 2. Aggregate Pipeline (from main - handles 'daily' map unwinding)
    pipeline = [
        {"$match": match_filter},
        # Ensure only documents with 'daily' field are processed
        {"$match": {"daily": {"$exists": True}}},
        # Convert daily map to array of k,v
        {
            "$project": {
                "classId": "$subjectId", 
                "dailyArray": {"$objectToArray": "$daily"}
            }
        },
        {"$unwind": "$dailyArray"},
        {
            "$addFields": {
                "date": "$dailyArray.k",
                "summary": "$dailyArray.v",
                "yearMonth": {"$substr": ["$dailyArray.k", 0, 7]}  # Extract YYYY-MM
            }
        },
        {
            "$group": {
                "_id": {
                    "classId": "$classId",
                    "yearMonth": "$yearMonth",
                },
                "totalPresent": {"$sum": "$summary.present"},
                "totalAbsent": {"$sum": "$summary.absent"},
                "totalLate": {"$sum": "$summary.late"},
                "totalStudents": {"$sum": "$summary.total"},
                "daysRecorded": {"$sum": 1},
            }
        },
        {
            "$addFields": {
                "averagePercentage": {
                    "$cond": {
                        "if": {"$gt": ["$totalStudents", 0]},
                        "then": {
                            "$round": [
                                {
                                    "$multiply": [
                                        {
                                            "$divide": [
                                                "$totalPresent",
                                                "$totalStudents",
                                            ]
                                        },
                                        100,
                                    ]
                                },
                                2,
                            ]
                        },
                        "else": 0,
                    }
                }
            }
        },
        {"$sort": {"_id.yearMonth": -1}},
    ]

    results = await db.attendance_daily.aggregate(pipeline).to_list(length=1000)

    # Format response
    summary_data = []
    for result in results:
        summary_data.append(
            {
                "classId": str(result["_id"]["classId"]),
                "month": result["_id"]["yearMonth"],
                "totalPresent": result["totalPresent"],
                "totalAbsent": result["totalAbsent"],
                "totalLate": result["totalLate"],
                "totalStudents": result["totalStudents"],
                "daysRecorded": result["daysRecorded"],
                "averagePercentage": result["averagePercentage"],
            }
        )

    return {"data": summary_data}


@router.get("/class-risk")
async def get_class_risk(
    current_user: dict = Depends(get_current_user),
):
    """
    Get classes at risk (attendance percentage < 75%).
    Returns classes with low attendance rates that need attention.
    """
    # 1. Auth & Scope (from 304)
    teacher_oid = _get_teacher_oid(current_user)
    subjects = await _get_teacher_subjects(teacher_oid)
    subject_ids = [subject["_id"] for subject in subjects]

    if not subject_ids:
        return {"data": []}

    # 2. Pipeline (from main - 'subjectId' match + 'daily' map unwinding)
    pipeline = [
        {"$match": {"subjectId": {"$in": subject_ids}}},
        # Convert daily map to array
        {
            "$project": {
                "classId": "$subjectId", 
                "dailyArray": {"$objectToArray": "$daily"}
            }
        },
        {"$unwind": "$dailyArray"},
        {
            "$addFields": {
                "recordDate": "$dailyArray.k",
                "summary": "$dailyArray.v",
            }
        },
        {
            "$group": {
                "_id": "$classId",
                "totalPresent": {"$sum": "$summary.present"},
                "totalAbsent": {"$sum": "$summary.absent"},
                "totalLate": {"$sum": "$summary.late"},
                "totalStudents": {"$sum": "$summary.total"},
                "lastRecorded": {"$max": "$recordDate"},
            }
        },
        {
            "$addFields": {
                "attendancePercentage": {
                    "$cond": {
                        "if": {"$gt": ["$totalStudents", 0]},
                        "then": {
                            "$round": [
                                {
                                    "$multiply": [
                                        {
                                            "$divide": [
                                                "$totalPresent",
                                                "$totalStudents",
                                            ]
                                        },
                                        100,
                                    ]
                                },
                                2,
                            ]
                        },
                        "else": 0,
                    }
                }
            }
        },
        {"$match": {"attendancePercentage": {"$lt": 75}}},
        {"$sort": {"attendancePercentage": 1}},
    ]

    results = await db.attendance_daily.aggregate(pipeline).to_list(length=1000)

    # Get class names from subjects collection
    class_ids = [result["_id"] for result in results]
    subjects_cursor = db.subjects.find(
        {"_id": {"$in": class_ids}}, {"name": 1, "code": 1}
    )
    subjects_list = await subjects_cursor.to_list(length=1000)
    subject_map = {str(s["_id"]): s for s in subjects_list}

    # Format response
    at_risk_classes = []
    for result in results:
        class_id_str = str(result["_id"])
        subject = subject_map.get(class_id_str, {})

        at_risk_classes.append(
            {
                "classId": class_id_str,
                "className": subject.get("name", "Unknown"),
                "classCode": subject.get("code", "N/A"),
                "attendancePercentage": result["attendancePercentage"],
                "totalPresent": result["totalPresent"],
                "totalAbsent": result["totalAbsent"],
                "totalLate": result["totalLate"],
                "totalStudents": result["totalStudents"],
                "lastRecorded": result["lastRecorded"],
            }
        )

    return {"data": at_risk_classes}


@router.get("/global")
async def get_global_stats(
    current_user: dict = Depends(get_current_user),
):
    """
    Get aggregated statistics for the logged-in teacher.
    """
    teacher_oid = _get_teacher_oid(current_user)
    subjects = await _get_teacher_subjects(teacher_oid)

    if not subjects:
        return {
            "overall_attendance": 0.0,
            "risk_count": 0,
            "top_subjects": [],
        }

    subject_ids = [s["_id"] for s in subjects]
    subject_map = {str(s["_id"]): s for s in subjects}

    # Aggregate attendance data for all teacher's subjects
    pipeline = [
        {"$match": {"subjectId": {"$in": subject_ids}}},
         # Convert daily map to array
        {
            "$project": {
                "classId": "$subjectId", 
                "dailyArray": {"$objectToArray": "$daily"}
            }
        },
        {"$unwind": "$dailyArray"},
        {
            "$addFields": {
                "summary": "$dailyArray.v",
            }
        },
        {
            "$group": {
                "_id": "$classId",
                "totalPresent": {"$sum": "$summary.present"},
                "totalAbsent": {"$sum": "$summary.absent"},
                "totalLate": {"$sum": "$summary.late"},
                "totalStudents": {"$sum": "$summary.total"},
            }
        },
        {
            "$addFields": {
                "attendancePercentage": {
                    "$cond": {
                        "if": {"$gt": ["$totalStudents", 0]},
                        "then": {
                            "$round": [
                                {
                                    "$multiply": [
                                        {
                                            "$divide": [
                                                "$totalPresent",
                                                "$totalStudents",
                                            ]
                                        },
                                        100,
                                    ]
                                },
                                2,
                            ]
                        },
                        "else": 0,
                    }
                }
            }
        },
        {"$sort": {"attendancePercentage": -1}},
    ]

    results = await db.attendance_daily.aggregate(pipeline).to_list(length=1000)

    # Build stats for subjects with attendance data
    subject_stats = []
    # stats_by_id = {} # Unused variable removed
    total_percentage = 0.0
    risk_count = 0

    for result in results:
        class_id_str = str(result["_id"])
        subject_info = subject_map.get(class_id_str, {})
        attendance_pct = result["attendancePercentage"]
        stat = {
            "subjectId": class_id_str,
            "subjectName": subject_info.get("name", "Unknown"),
            "subjectCode": subject_info.get("code", "N/A"),
            "attendancePercentage": attendance_pct,
            "totalPresent": result["totalPresent"],
            "totalAbsent": result["totalAbsent"],
            "totalLate": result["totalLate"],
            "totalStudents": result["totalStudents"],
        }
        subject_stats.append(stat)
        # stats_by_id[class_id_str] = stat
        total_percentage += attendance_pct
        if attendance_pct < 75:
            risk_count += 1


    # Re-sort by attendancePercentage descending
    subject_stats.sort(key=lambda x: x["attendancePercentage"], reverse=True)

    # Recompute overall_attendance
    overall_attendance = (
        round(total_percentage / len(subject_stats), 2) if subject_stats else 0.0
    )

    return {
        "overall_attendance": overall_attendance,
        "risk_count": risk_count,
        "top_subjects": subject_stats,
    }