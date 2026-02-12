from pydantic import BaseModel
from typing import List


class EncodeFaceRequest(BaseModel):
    """Request to encode a single face from an image"""

    image_base64: str
    validate_single: bool = True
    min_face_area_ratio: float = 0.05
    num_jitters: int = 5


class DetectFacesRequest(BaseModel):
    """Request to detect multiple faces from an image"""

    image_base64: str
    min_face_area_ratio: float = 0.04
    num_jitters: int = 3
    model: str = "hog"


class CandidateEmbedding(BaseModel):
    """Candidate student embeddings for matching"""

    student_id: str
    embeddings: List[List[float]]


class MatchFacesRequest(BaseModel):
    """Request to match a single face embedding against candidates"""

    query_embedding: List[float]
    candidate_embeddings: List[CandidateEmbedding]
    threshold: float = 0.6
    return_all_distances: bool = False


class DetectedFace(BaseModel):
    """A detected face with embedding"""

    embedding: List[float]


class BatchMatchRequest(BaseModel):
    """Request to match multiple detected faces against candidates"""

    detected_faces: List[DetectedFace]
    candidate_embeddings: List[CandidateEmbedding]
    confident_threshold: float = 0.50
    uncertain_threshold: float = 0.60
