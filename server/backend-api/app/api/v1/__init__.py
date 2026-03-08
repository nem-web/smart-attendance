from fastapi import APIRouter

from ..routes import teacher_settings as settings_router
from ..routes.schedule import router as schedule_router
from ..routes.holidays import router as holidays_router
from ..routes.attendance import router as attendance_router
from ..routes.auth import router as auth_router
from ..routes.analytics import router as analytics_router
from ..routes.notifications import router as notifications_router
from ..routes.reports import router as reports_router
from ..routes.students import router as students_router
from ..routes.health import router as health_router
from ..routes.webauthn import router as webauthn_router
from ..routes.exams import router as exams_router

# Api routes versioning ( for v1 ) /api/v1/...
router = APIRouter(prefix="/api/v1")

router.include_router(auth_router)
router.include_router(students_router)
router.include_router(attendance_router)
router.include_router(schedule_router)
router.include_router(holidays_router)  # ← NEW
router.include_router(settings_router.router)
router.include_router(notifications_router)
router.include_router(analytics_router)
router.include_router(reports_router)
router.include_router(health_router, tags=["Health"])
router.include_router(webauthn_router)
router.include_router(exams_router)

# router for legacy routes -> e.g  /api/auth/login
legacyRouter = APIRouter(prefix="/api")

legacyRouter.include_router(auth_router)
legacyRouter.include_router(students_router)
legacyRouter.include_router(attendance_router)
legacyRouter.include_router(schedule_router)
legacyRouter.include_router(holidays_router)  # ← NEW
legacyRouter.include_router(settings_router.router)
legacyRouter.include_router(notifications_router)
legacyRouter.include_router(analytics_router)
legacyRouter.include_router(reports_router)
legacyRouter.include_router(health_router, tags=["Health"])
legacyRouter.include_router(webauthn_router)
legacyRouter.include_router(exams_router)
