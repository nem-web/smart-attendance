from prometheus_client import Counter, Gauge

# Business Logic Metrics
ATTENDANCE_MARKED = Counter(
    'attendance_marked_total',
    'Total attendance markings',
    ['subject', 'status']
)

STUDENT_REGISTRATION = Counter(
    'student_registration_total',
    'Total student registrations'
)

# Since instrumentator handles HTTP metrics, we can add specific ones if needed, 
# but usually business metrics are what we add manually.

ACTIVE_TEACHERS = Gauge(
    'active_teachers_total',
    'Number of currently active teachers'
)
