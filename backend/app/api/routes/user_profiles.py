from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from datetime import datetime
from bson import ObjectId

from ...schemas.user import UserProfileCreate, UserProfileUpdate, UserProfileResponse
from ...db.mongo import db

router = APIRouter(prefix="/user-profiles", tags=["User Profiles"])


@router.post("/", response_model=UserProfileResponse)
async def create_user_profile(payload: UserProfileCreate):
    """Create a user profile after Clerk signup"""
    
    # Validate role
    if payload.role not in ["student", "teacher"]:
        raise HTTPException(status_code=400, detail="Role must be 'student' or 'teacher'")
    
    # Validate required fields based on role
    if payload.role == "student":
        if payload.admission_year is None or not payload.class_semester or not payload.roll_number:
            raise HTTPException(
                status_code=400,
                detail="Students must provide admission_year, class_semester, and roll_number"
            )
    elif payload.role == "teacher":
        if not payload.designation or not payload.assigned_classes:
            raise HTTPException(
                status_code=400,
                detail="Teachers must provide designation and assigned_classes"
            )
    
    # Check if profile already exists
    existing = await db.user_profiles.find_one({"clerk_user_id": payload.clerk_user_id})
    if existing:
        raise HTTPException(status_code=400, detail="User profile already exists")
    
    # Create profile document
    profile_doc = {
        "clerk_user_id": payload.clerk_user_id,
        "role": payload.role,
        "branch": payload.branch,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    # Add role-specific fields
    if payload.role == "student":
        profile_doc["admission_year"] = payload.admission_year
        profile_doc["class_semester"] = payload.class_semester
        profile_doc["roll_number"] = payload.roll_number
    elif payload.role == "teacher":
        profile_doc["designation"] = payload.designation
        profile_doc["assigned_classes"] = payload.assigned_classes
    
    # Insert into database
    try:
        result = await db.user_profiles.insert_one(profile_doc)
        profile_doc["_id"] = result.inserted_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create profile: {str(e)}")
    
    return UserProfileResponse(**profile_doc)


@router.get("/{clerk_user_id}", response_model=UserProfileResponse)
async def get_user_profile(clerk_user_id: str):
    """Get user profile by Clerk user ID"""
    
    profile = await db.user_profiles.find_one({"clerk_user_id": clerk_user_id})
    
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return UserProfileResponse(**profile)


@router.put("/{clerk_user_id}", response_model=UserProfileResponse)
async def update_user_profile(clerk_user_id: str, payload: UserProfileUpdate):
    """Update user profile"""
    
    # Check if profile exists
    existing = await db.user_profiles.find_one({"clerk_user_id": clerk_user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    # Prepare update data
    update_data = {"updated_at": datetime.utcnow()}
    
    if payload.role is not None:
        if payload.role not in ["student", "teacher"]:
            raise HTTPException(status_code=400, detail="Role must be 'student' or 'teacher'")
        update_data["role"] = payload.role
    
    if payload.branch is not None:
        update_data["branch"] = payload.branch
    
    if payload.admission_year is not None:
        update_data["admission_year"] = payload.admission_year
    
    if payload.class_semester is not None:
        update_data["class_semester"] = payload.class_semester
    
    if payload.roll_number is not None:
        update_data["roll_number"] = payload.roll_number
    
    if payload.designation is not None:
        update_data["designation"] = payload.designation
    
    if payload.assigned_classes is not None:
        update_data["assigned_classes"] = payload.assigned_classes
    
    # Update in database
    try:
        await db.user_profiles.update_one(
            {"clerk_user_id": clerk_user_id},
            {"$set": update_data}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
    
    # Fetch and return updated profile
    updated_profile = await db.user_profiles.find_one({"clerk_user_id": clerk_user_id})
    return UserProfileResponse(**updated_profile)


@router.delete("/{clerk_user_id}")
async def delete_user_profile(clerk_user_id: str):
    """Delete user profile"""
    
    result = await db.user_profiles.delete_one({"clerk_user_id": clerk_user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return {"message": "User profile deleted successfully"}
