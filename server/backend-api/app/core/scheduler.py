import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.attendance_alerts import process_monthly_low_attendance_alerts

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

    scheduler.start()
    logger.info("APScheduler started.")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shut down.")
