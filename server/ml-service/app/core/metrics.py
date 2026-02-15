from prometheus_client import Counter, Histogram, Gauge

FACE_DETECTION_ACCURACY = Gauge(
    'face_detection_confidence',
    'Confidence score of face detection'
)

FACES_DETECTED_TOTAL = Counter(
    'faces_detected_count',
    'Total number of faces detected in an image'
)

ML_ERRORS = Counter(
    'ml_service_errors_total',
    'ML service errors',
    ['error_type']
)
