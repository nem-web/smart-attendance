import httpx
import os
from typing import Optional, List, Dict, Any


class MLClient:
    """HTTP client for communicating with ML Service"""

    def __init__(self):
        self.base_url = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
        self.api_key = os.getenv("ML_API_KEY", "your-secret-api-key-here")
        self.timeout = float(os.getenv("ML_SERVICE_TIMEOUT", "30"))
        self.max_retries = int(os.getenv("ML_SERVICE_MAX_RETRIES", "3"))

        # Create httpx client with connection pooling
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"X-API-KEY": self.api_key},
            timeout=self.timeout,
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
        )

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict] = None,
        retries: int = 0,
    ) -> Dict[str, Any]:
        """
        Make HTTP request to ML service with retry logic
        """
        try:
            response = await self.client.request(
                method=method, url=endpoint, json=json_data
            )
            response.raise_for_status()
            return response.json()

        except httpx.TimeoutException:
            if retries < self.max_retries:
                return await self._make_request(
                    method, endpoint, json_data, retries + 1
                )
            raise Exception(f"ML Service timeout after {self.max_retries} retries")

        except httpx.HTTPStatusError as e:
            raise Exception(
                f"ML Service error: {e.response.status_code} - {e.response.text}"
            )

        except Exception as e:
            if retries < self.max_retries:
                return await self._make_request(
                    method, endpoint, json_data, retries + 1
                )
            raise Exception(f"ML Service communication error: {str(e)}")

    async def encode_face(
        self,
        image_base64: str,
        validate_single: bool = True,
        min_face_area_ratio: float = 0.05,
        num_jitters: int = 5,
    ) -> Dict[str, Any]:
        """
        Encode a single face from an image

        Returns:
            {
                "success": bool,
                "embedding": List[float],
                "face_location": {...},
                "metadata": {...},
                "error": str (optional)
            }
        """
        request_data = {
            "image_base64": image_base64,
            "validate_single": validate_single,
            "min_face_area_ratio": min_face_area_ratio,
            "num_jitters": num_jitters,
        }

        return await self._make_request("POST", "/api/ml/encode-face", request_data)

    async def detect_faces(
        self,
        image_base64: str,
        min_face_area_ratio: float = 0.04,
        num_jitters: int = 3,
        model: str = "hog",
    ) -> Dict[str, Any]:
        """
        Detect multiple faces from an image

        Returns:
            {
                "success": bool,
                "faces": [{
                    "embedding": List[float],
                    "location": {...},
                    "face_area_ratio": float
                }],
                "count": int,
                "metadata": {...}
            }
        """
        request_data = {
            "image_base64": image_base64,
            "min_face_area_ratio": min_face_area_ratio,
            "num_jitters": num_jitters,
            "model": model,
        }

        return await self._make_request("POST", "/api/ml/detect-faces", request_data)

    async def match_faces(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[Dict[str, Any]],
        threshold: float = 0.6,
        return_all_distances: bool = False,
    ) -> Dict[str, Any]:
        """
        Match a face embedding against candidate embeddings

        candidate_embeddings format: [
            {
                "student_id": str,
                "embeddings": [[float], [float], ...]
            },
            ...
        ]

        Returns:
            {
                "success": bool,
                "match": {
                    "student_id": str,
                    "distance": float,
                    "confidence": float,
                    "status": str
                },
                "all_distances": [...] (optional)
            }
        """
        request_data = {
            "query_embedding": query_embedding,
            "candidate_embeddings": candidate_embeddings,
            "threshold": threshold,
            "return_all_distances": return_all_distances,
        }

        return await self._make_request("POST", "/api/ml/match-faces", request_data)

    async def batch_match(
        self,
        detected_faces: List[Dict[str, Any]],
        candidate_embeddings: List[Dict[str, Any]],
        confident_threshold: float = 0.50,
        uncertain_threshold: float = 0.60,
    ) -> Dict[str, Any]:
        """
        Match multiple detected faces against candidate embeddings

        detected_faces format: [
            {"embedding": [float, ...]},
            ...
        ]

        candidate_embeddings format: [
            {
                "student_id": str,
                "embeddings": [[float], [float], ...]
            },
            ...
        ]

        Returns:
            {
                "success": bool,
                "matches": [{
                    "face_index": int,
                    "student_id": str or None,
                    "distance": float,
                    "status": str  # "present" or "unknown"
                }]
            }
        """
        request_data = {
            "detected_faces": detected_faces,
            "candidate_embeddings": candidate_embeddings,
            "confident_threshold": confident_threshold,
            "uncertain_threshold": uncertain_threshold,
        }

        return await self._make_request("POST", "/api/ml/batch-match", request_data)

    async def health_check(self) -> Dict[str, Any]:
        """
        Check ML service health

        Returns:
            {
                "status": str,
                "service": str,
                "version": str,
                "models_loaded": bool,
                "uptime_seconds": float
            }
        """
        return await self._make_request("GET", "/health")


# Global ML client instance
ml_client = MLClient()
