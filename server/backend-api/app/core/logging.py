import logging
import sys
import structlog


def setup_logging(service_name: str = "backend-api"):
    """
    Configure structured JSON logging for the application.
    Ensures ALL logs (including standard logging) are JSON formatted.
    """

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        # structlog.stdlib.filter_by_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        # Add service name to all logs
        lambda _, __, event_dict: {**event_dict, "service": service_name},
        # Add call-site info (file, function, line number) to all logs
        structlog.processors.CallsiteParameterAdder(
            {
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.FUNC_NAME,
                structlog.processors.CallsiteParameter.LINENO,
            }
        ),
    ]

    structlog.configure(
        processors=shared_processors
        + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Use structlog's JSON formatter for standard logging
    formatter = structlog.stdlib.ProcessorFormatter(
        # These run ONLY on `logging` standard library calls
        foreign_pre_chain=shared_processors,
        # These run on EVERYTHING (structlog + logging)
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)

    # Silence uvicorn access logs if needed, or let them be formatted
    # Configure uvicorn loggers to use the same handler but not propagate to root
    uvicorn_access_logger = logging.getLogger("uvicorn.access")
    uvicorn_access_logger.handlers = [handler]
    uvicorn_access_logger.propagate = False

    uvicorn_error_logger = logging.getLogger("uvicorn.error")
    uvicorn_error_logger.handlers = [handler]
    uvicorn_error_logger.propagate = False

    # Configure the structlog logger with the service name bound
    log = structlog.get_logger()
    return log.bind(service=service_name)


# Global logger instance (initialized later or used via get_logger)
logger = structlog.get_logger()
