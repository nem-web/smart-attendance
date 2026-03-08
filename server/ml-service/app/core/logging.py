import logging
import sys
import structlog


def setup_logging(service_name: str = "ml-service"):
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
        foreign_pre_chain=shared_processors,
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

    # Configure the structlog logger with the service name bound
    log = structlog.get_logger()
    # We return a bound logger. Standard logging calls won't have 'service'
    # unless we add a processor for it or rely on the bound logger usage.
    return log.bind(service=service_name)


logger = structlog.get_logger()
