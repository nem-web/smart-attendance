"""
Analytics API routes for attendance data.
"""

from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.db.mongo import db

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/attendance-trend")
async def get_attendance_trend(
    classId: str = Query(..., description="Class/Subject ID"),
    dateFrom: str = Query(..., description="Start date (YYYY-MM-DD)"),
    dateTo: str = Query(..., description="End date (YYYY-MM-DD)"),
):
    """
    Get attendance trend for a specific class within a date range.

    Returns daily attendance data including present, absent, late counts and percentage.
    """
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

    # Query attendance_daily collection
    cursor = db.attendance_daily.find(
        {
            "classId": class_oid,
            "date": {"$gte": dateFrom, "$lte": dateTo},
        }
    ).sort("date", 1)

    records = await cursor.to_list(length=1000)

    # Format response
    trend_data = []
    for record in records:
        summary = record.get("summary", {})
        trend_data.append(
            {
                "date": record["date"],
                "present": summary.get("present", 0),
                "absent": summary.get("absent", 0),
                "late": summary.get("late", 0),
                "total": summary.get("total", 0),
                "percentage": summary.get("percentage", 0.0),
            }
        )

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
):
    """
    Get monthly attendance summary aggregated by month.

    Can be filtered by classId or return all classes.
    """
    # Build match filter
    match_filter = {}
    if classId:
        try:
            class_oid = ObjectId(classId)
            match_filter["classId"] = class_oid
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid classId format")

    # Aggregate by month
    pipeline = [
        {"$match": match_filter} if match_filter else {"$match": {}},
        {
            "$addFields": {
                "yearMonth": {"$substr": ["$date", 0, 7]}  # Extract YYYY-MM
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
async def get_class_risk():
    """
    Get classes at risk (attendance percentage < 75%).

    Returns classes with low attendance rates that need attention.
    """
    # Aggregate to get overall percentage per class
    pipeline = [
        {
            "$group": {
                "_id": "$classId",
                "totalPresent": {"$sum": "$summary.present"},
                "totalAbsent": {"$sum": "$summary.absent"},
                "totalLate": {"$sum": "$summary.late"},
                "totalStudents": {"$sum": "$summary.total"},
                "lastRecorded": {"$max": "$date"},
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
    subjects = await subjects_cursor.to_list(length=1000)
    subject_map = {str(s["_id"]): s for s in subjects}

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

    Returns:
        - overall_attendance: Average attendance across all teacher's subjects
        - risk_count: Number of subjects with attendance < 75%
        - top_subjects: List of subjects sorted by attendance percentage (descending)
    """
    # Ensure user is a teacher
    if current_user.get("role") != "teacher":
        raise HTTPException(
            status_code=403, detail="Only teachers can access global statistics"
        )

    # Get teacher's user ID
    try:
        teacher_oid = ObjectId(current_user["id"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Query all subjects where teacher_id matches current user
    subjects_cursor = db.subjects.find(
        {"professor_ids": teacher_oid}, {"_id": 1, "name": 1, "code": 1}
    )
    subjects = await subjects_cursor.to_list(length=1000)

    if not subjects:
        # No subjects for this teacher
        return {
            "overall_attendance": 0.0,
            "risk_count": 0,
            "top_subjects": [],
        }

    subject_ids = [s["_id"] for s in subjects]
    subject_map = {str(s["_id"]): s for s in subjects}

    # Aggregate attendance data for all teacher's subjects
    pipeline = [
        {"$match": {"classId": {"$in": subject_ids}}},
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
                                        {"$divide": ["$totalPresent", "$totalStudents"]},
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
    stats_by_id = {}
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
        stats_by_id[class_id_str] = stat
        total_percentage += attendance_pct
        if attendance_pct < 75:
            risk_count += 1

    # Add subjects with no attendance data as 0% attendance
    for s in subjects:
        sid = str(s["_id"])
        if sid not in stats_by_id:
            stat = {
                "subjectId": sid,
                "subjectName": s.get("name", "Unknown"),
                "subjectCode": s.get("code", "N/A"),
                "attendancePercentage": 0.0,
                "totalPresent": 0,
                "totalAbsent": 0,
                "totalLate": 0,
                "totalStudents": 0,
            }
            subject_stats.append(stat)
            total_percentage += 0.0
            risk_count += 1  # 0% < 75%

    # Re-sort by attendancePercentage descending
    subject_stats.sort(key=lambda x: x["attendancePercentage"], reverse=True)

    # Recompute overall_attendance (unweighted average of all subjects, including 0% subjects)
    # Note: Each subject contributes equally regardless of student count
    overall_attendance = (
        round(total_percentage / len(subject_stats), 2) if subject_stats else 0.0
    )

    return {
        "overall_attendance": overall_attendance,
        "risk_count": risk_count,
        "top_subjects": subject_stats,
    }
