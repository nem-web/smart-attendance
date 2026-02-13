from fastapi import Request, status
from fastapi.responses import JSONResponse
import structlog
from .exceptions import SmartAttendanceException

logger = structlog.get_logger()

async def smart_attendance_exception_handler(request: Request, exc: SmartAttendanceException):
    logger.error(
        "Application error",
        error_type=exc.__class__.__name__,
        error_message=exc.message,
        status_code=exc.status_code
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "correlation_id": getattr(request.state, 'correlation_id', None)
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred",
            "correlation_id": getattr(request.state, 'correlation_id', None)
        }
    )
