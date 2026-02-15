from pydantic import BaseModel
from typing import Optional, List


class FaceLocation(BaseModel):
    """Face location in image"""

    top: int
    right: int
    bottom: int
    left: int


class EncodeFaceMetadata(BaseModel):
    """Metadata for face encoding"""

    face_area_ratio: float
    image_dimensions: List[int]


class EncodeFaceResponse(BaseModel):
    """Response from encode face endpoint"""

    success: bool
    embedding: Optional[List[float]] = None
    face_location: Optional[FaceLocation] = None
    metadata: Optional[EncodeFaceMetadata] = None
    error: Optional[str] = None
    error_code: Optional[str] = None


class DetectedFaceInfo(BaseModel):
    """Information about a detected face"""

    embedding: List[float]
    location: FaceLocation
    face_area_ratio: float


class DetectFacesMetadata(BaseModel):
    """Metadata for face detection"""

    image_dimensions: List[int]
    processing_time_ms: float


class DetectFacesResponse(BaseModel):
    """Response from detect faces endpoint"""

    success: bool
    faces: List[DetectedFaceInfo] = []
    count: int = 0
    metadata: Optional[DetectFacesMetadata] = None
    error: Optional[str] = None


class MatchResult(BaseModel):
    """Result of face matching"""

    student_id: Optional[str] = None
    distance: float
    confidence: float
    status: str  # "confident", "uncertain", "no_match"


class DistanceInfo(BaseModel):
    """Distance information for a candidate"""

    student_id: str
    min_distance: float


class MatchFacesResponse(BaseModel):
    """Response from match faces endpoint"""

    success: bool
    match: Optional[MatchResult] = None
    all_distances: Optional[List[DistanceInfo]] = None
    error: Optional[str] = None


class BatchMatchResult(BaseModel):
    """Result of matching a single detected face"""

    face_index: int
    student_id: Optional[str] = None
    distance: float
    status: str  # "present", "unknown"


class BatchMatchResponse(BaseModel):
    """Response from batch match endpoint"""

    success: bool
    matches: List[BatchMatchResult] = []
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    service: str
    version: str
    models_loaded: bool
    uptime_seconds: float
