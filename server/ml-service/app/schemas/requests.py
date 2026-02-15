from pydantic import BaseModel, Field
from typing import List


class EncodeFaceRequest(BaseModel):
    """Request to encode a single face from an image"""

    image_base64: str = Field(..., description="Base64 encoded image string")
    validate_single: bool = Field(
        default=True, description="Validate that exactly one face exists"
    )
    min_face_area_ratio: float = Field(
        default=0.05, description="Minimum face area ratio"
    )
    num_jitters: int = Field(
        default=5, description="Number of times to re-sample face for encoding"
    )


class DetectFacesRequest(BaseModel):
    """Request to detect multiple faces from an image"""

    image_base64: str = Field(..., description="Base64 encoded image string")
    min_face_area_ratio: float = Field(
        default=0.04, description="Minimum face area ratio"
    )
    num_jitters: int = Field(
        default=3, description="Number of times to re-sample face for encoding"
    )
    model: str = Field(default="hog", description="Detection model: hog or cnn")


class CandidateEmbedding(BaseModel):
    """Candidate student embeddings for matching"""

    student_id: str = Field(..., description="Student ID")
    embeddings: List[List[float]] = Field(
        ..., description="List of face embeddings for this student"
    )


class MatchFacesRequest(BaseModel):
    """Request to match a single face embedding against candidates"""

    query_embedding: List[float] = Field(..., description="Face embedding to match")
    candidate_embeddings: List[CandidateEmbedding] = Field(
        ..., description="Candidate students with embeddings"
    )
    threshold: float = Field(default=0.6, description="Distance threshold for matching")
    return_all_distances: bool = Field(
        default=False, description="Return distances for all candidates"
    )


class DetectedFace(BaseModel):
    """A detected face with embedding"""

    embedding: List[float] = Field(..., description="Face embedding")


class BatchMatchRequest(BaseModel):
    """Request to match multiple detected faces against candidates"""

    detected_faces: List[DetectedFace] = Field(
        ..., description="List of detected faces to match"
    )
    candidate_embeddings: List[CandidateEmbedding] = Field(
        ..., description="Candidate students with embeddings"
    )
    confident_threshold: float = Field(
        default=0.50, description="Threshold for confident match"
    )
    uncertain_threshold: float = Field(
        default=0.60, description="Threshold for uncertain match"
    )
