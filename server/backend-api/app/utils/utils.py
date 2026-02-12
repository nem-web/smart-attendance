# backend/app/db/utils.py
from bson import ObjectId
from datetime import datetime
from typing import Any, Dict


def _convert_value(v: Any) -> Any:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, datetime):
        # ISO 8601 string
        return v.isoformat()
    if isinstance(v, dict):
        return serialize_bson(v)
    if isinstance(v, list):
        return [_convert_value(i) for i in v]
    return v


def serialize_bson(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively convert ObjectId -> str and datetime -> isoformat in a dict.
    Use this right before returning DB docs via FastAPI.
    """
    out: Dict[str, Any] = {}
    for k, v in doc.items():
        out[k] = _convert_value(v)
    return out
