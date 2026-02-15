from fastapi import APIRouter
from datetime import datetime, timezone
import psutil
import shutil

router = APIRouter()

def get_uptime():
    try:
        p = psutil.Process()
        create_time = p.create_time()
        return datetime.now().timestamp() - create_time
    except Exception:
        return 0.0

def get_memory_usage():
    try:
        mem = psutil.virtual_memory()
        return {
            "total": mem.total,
            "available": mem.available,
            "percent": mem.percent
        }
    except Exception:
        return {}

def get_cpu_usage():
    try:
        return psutil.cpu_percent(interval=None)
    except Exception:
        return 0.0

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/health/detailed")
async def detailed_health():
    try:
        total, used, free = shutil.disk_usage(".")
        storage = {
            "healthy": True,
            "total_gb": total // (2**30),
            "free_gb": free // (2**30)
        }
    except Exception:
        storage = {"healthy": False}
    
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "storage": storage
        },
        "metrics": {
            "uptime_seconds": get_uptime(),
            "memory": get_memory_usage(),
            "cpu_percent": get_cpu_usage()
        }
    }
