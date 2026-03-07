import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING

logger = logging.getLogger("app.db.indexes")


async def create_indexes(db: AsyncIOMotorDatabase):
    """
    Creates necessary indexes for MongoDB collections to improve query performance.
    Arguments:
        db: The MongoDB database instance (AsyncIOMotorDatabase).
    """
    try:
        # Users Collection
        # 1. Unique index on email: Ensures uniqueness and optimizes lookup by email
        # (authentication).
        await db.users.create_index([("email", ASCENDING)], unique=True)
        # 2. Index on role: Optimizes queries filtering users by their role
        # (e.g., getting all teachers).
        await db.users.create_index([("role", ASCENDING)])
        logger.info("Created indexes for users collection.")

        # Students Collection
        # 1. Index on user_id: Optimizes joining student profile with user account
        # details.
        await db.students.create_index([("user_id", ASCENDING)])
        # 2. Index on subject_ids: Optimizes reverse lookup to find all students
        # enrolled in a specific subject.
        await db.students.create_index([("subject_ids", ASCENDING)])
        logger.info("Created indexes for students collection.")

        # Subjects Collection
        # 1. Index on teacher_id: Optimizes fetching all subjects assigned to a
        # specific teacher.
        await db.subjects.create_index([("teacher_id", ASCENDING)])
        # 2. Index on student_ids: Optimizes finding all subjects a specific student is
        # enrolled in.
        await db.subjects.create_index([("student_ids", ASCENDING)])
        logger.info("Created indexes for subjects collection.")

        # Attendance Records Collection
        # 1. Compound index on (subject_id, date): Critical for querying attendance for
        # a specific class session.
        await db.attendance_records.create_index(
            [("subject_id", ASCENDING), ("date", ASCENDING)]
        )
        # 2. Index on student_id: Optimizes fetching attendance history for a specific
        # student.
        await db.attendance_records.create_index([("student_id", ASCENDING)])
        logger.info("Created indexes for attendance_records collection.")

        # Refresh Tokens Collection (H-06)
        # 1. TTL index on expires_at: Automatically removes expired refresh tokens to
        # maintain security and clean DB.
        # setting expireAfterSeconds=0 means the document expires at the time specified
        # in the 'expires_at' field.
        await db.refresh_tokens.create_index(
            [("expires_at", ASCENDING)], expireAfterSeconds=0
        )
        logger.info("Created indexes for refresh_tokens collection.")

        logger.info("All database indexes creation initiated.")
    except Exception as e:
        logger.error(f"Error creating database indexes: {e}")
