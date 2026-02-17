from unittest.mock import patch, MagicMock

from app.core.scheduler import start_scheduler, shutdown_scheduler, scheduler


def test_scheduler_starts_and_shuts_down():
    """Verify the scheduler can start and shut down without errors."""
    with patch.object(scheduler, "start") as mock_start:
        start_scheduler()
        mock_start.assert_called_once()
    with patch.object(scheduler, "shutdown") as mock_shutdown:
        with patch.object(
            type(scheduler), "running", new_callable=lambda: property(lambda s: True)
        ):
            shutdown_scheduler()
        mock_shutdown.assert_called_once()


def test_scheduler_double_shutdown():
    """Shutting down a non-running scheduler should be a no-op."""
    with patch.object(scheduler, "shutdown") as mock_shutdown:
        shutdown_scheduler()
        mock_shutdown.assert_not_called()
