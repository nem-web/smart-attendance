import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.attendance_alerts import process_monthly_low_attendance_alerts
from app.services.attendance_socket_service import flush_attendance_data

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler():
    scheduler.add_job(
        process_monthly_low_attendance_alerts,
        trigger=CronTrigger(day=1, hour=0, minute=0),
        id="monthly_low_attendance_alerts",
        replace_existing=True,
        name="Monthly Low Attendance Alerts",
    )
    
    # Batch flush every 5 minutes
    scheduler.add_job(
        flush_attendance_data,
        trigger="interval",
        minutes=5,
        id="flush_attendance_data",
        replace_existing=True,
        name="Flush Attendance Buffer",
    )

    scheduler.start()
    logger.info("APScheduler started.")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shut down.")
