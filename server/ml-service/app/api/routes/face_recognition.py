from fastapi import APIRouter, Depends
import base64
from io import BytesIO
import time
import numpy as np
from PIL import Image

from app.schemas.requests import (
    EncodeFaceRequest,
    DetectFacesRequest,
    MatchFacesRequest,
    BatchMatchRequest,
)
from app.schemas.responses import (
    EncodeFaceResponse,
    DetectFacesResponse,
    MatchFacesResponse,
    BatchMatchResponse,
    FaceLocation,
    EncodeFaceMetadata,
    DetectedFaceInfo,
    DetectFacesMetadata,
    MatchResult,
    DistanceInfo,
    BatchMatchResult,
)
from app.core.constants import (
    ERROR_NO_FACE,
    ERROR_MULTIPLE_FACES,
    ERROR_FACE_TOO_SMALL,
    ERROR_PROCESSING,
)
from app.core.security import verify_api_key

from app.ml.face_detector import detect_faces
from app.ml.face_encoder import get_face_embedding
from app.ml.face_matcher import cosine_similarity

router = APIRouter(
    prefix="/api/ml", tags=["ML"], dependencies=[Depends(verify_api_key)]
)


@router.post("/encode-face", response_model=EncodeFaceResponse)
async def encode_face(request: EncodeFaceRequest):
    try:
        image_bytes = base64.b64decode(request.image_base64)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)

        faces = detect_faces(image_np)

        if not faces:
            return EncodeFaceResponse(
                success=False, error="No face detected", error_code=ERROR_NO_FACE
            )

        if request.validate_single and len(faces) > 1:
            return EncodeFaceResponse(
                success=False,
                error="Multiple faces detected",
                error_code=ERROR_MULTIPLE_FACES,
            )

        x, y, face_w, face_h = faces[0]
        top = y
        right = x + face_w
        bottom = y + face_h
        left = x

        im_h, im_w, _ = image_np.shape
        face_area = face_w * face_h
        image_area = im_h * im_w

        if (face_area / image_area) < request.min_face_area_ratio:
            return EncodeFaceResponse(
                success=False, error="Face too small", error_code=ERROR_FACE_TOO_SMALL
            )

        face_img = image_np[top:bottom, left:right]
        embedding = get_face_embedding(face_img)

        return EncodeFaceResponse(
            success=True,
            embedding=embedding,
            face_location=FaceLocation(top=top, right=right, bottom=bottom, left=left),
            metadata=EncodeFaceMetadata(
                face_area_ratio=face_area / image_area, image_dimensions=[im_w, im_h]
            ),
        )

    except Exception as e:
        return EncodeFaceResponse(
            success=False, error=str(e), error_code=ERROR_PROCESSING
        )


@router.post("/detect-faces", response_model=DetectFacesResponse)
async def detect_faces_api(request: DetectFacesRequest):
    start = time.time()

    try:
        image_bytes = base64.b64decode(request.image_base64)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(image)

        faces = detect_faces(image_np)
        h, w, _ = image_np.shape
        image_area = h * w

        detected = []
        for x, y, cw, ch in faces:
            # Convert to TRBL
            top = y
            left = x
            bottom = y + ch
            right = x + cw

            face_area = cw * ch

            if face_area / image_area < request.min_face_area_ratio:
                continue

            face_img = image_np[top:bottom, left:right]
            embedding = get_face_embedding(face_img)

            detected.append(
                DetectedFaceInfo(
                    embedding=embedding,
                    location=FaceLocation(
                        top=top, right=right, bottom=bottom, left=left
                    ),
                    face_area_ratio=face_area / image_area,
                )
            )

        return DetectFacesResponse(
            success=True,
            faces=detected,
            count=len(detected),
            metadata=DetectFacesMetadata(
                image_dimensions=[w, h], processing_time_ms=(time.time() - start) * 1000
            ),
        )

    except Exception as e:
        return DetectFacesResponse(success=False, error=str(e))


@router.post("/match-faces", response_model=MatchFacesResponse)
async def match_faces(request: MatchFacesRequest):
    try:
        best_match = None
        best_score = -1.0
        all_distances = []

        for candidate in request.candidate_embeddings:
            scores = [
                cosine_similarity(request.query_embedding, emb)
                for emb in candidate.embeddings
            ]
            score = max(scores)

            if request.return_all_distances:
                all_distances.append(
                    DistanceInfo(
                        student_id=candidate.student_id, min_distance=1 - score
                    )
                )

            if score > best_score:
                best_score = score
                best_match = candidate.student_id

        if best_score >= request.threshold:
            return MatchFacesResponse(
                success=True,
                match=MatchResult(
                    student_id=best_match,
                    distance=1 - best_score,
                    confidence=best_score,
                    status="confident",
                ),
                all_distances=all_distances if request.return_all_distances else None,
            )

        return MatchFacesResponse(success=True, match=None)

    except Exception as e:
        return MatchFacesResponse(success=False, error=str(e))


@router.post("/batch-match", response_model=BatchMatchResponse)
async def batch_match(request: BatchMatchRequest):
    try:
        results = []

        for idx, face in enumerate(request.detected_faces):
            best_id = None
            best_score = -1.0

            for candidate in request.candidate_embeddings:
                scores = [
                    cosine_similarity(face.embedding, emb)
                    for emb in candidate.embeddings
                ]
                score = max(scores)

                if score > best_score:
                    best_score = score
                    best_id = candidate.student_id

            status = (
                "present" if best_score >= request.confident_threshold else "unknown"
            )

            results.append(
                BatchMatchResult(
                    face_index=idx,
                    student_id=best_id if status == "present" else None,
                    distance=1 - best_score,
                    status=status,
                )
            )

        return BatchMatchResponse(success=True, matches=results)

    except Exception as e:
        return BatchMatchResponse(success=False, error=str(e))
