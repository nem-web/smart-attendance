class SmartAttendanceException(Exception):
    """Base exception for Smart Attendance"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class AuthenticationError(SmartAttendanceException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)

class AuthorizationError(SmartAttendanceException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403)

class ResourceNotFoundError(SmartAttendanceException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", status_code=404)

class ValidationError(SmartAttendanceException):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)

class MLServiceError(SmartAttendanceException):
    def __init__(self, message: str = "ML service error"):
        super().__init__(message, status_code=503)
