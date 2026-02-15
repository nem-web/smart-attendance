from fastapi import APIRouter
from datetime import datetime, timezone
import psutil
import shutil
from app.db.mongo import client
import httpx
import os

router = APIRouter()

async def check_database():
    try:
        # The is_master command is cheap and fast
        await client.admin.command('ping')
        return {"status": "healthy", "healthy": True}
    except Exception as e:
        return {"status": "unhealthy", "healthy": False, "error": str(e)}

async def check_ml_service():
    ml_url = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient(timeout=3.0) as http_client:
            response = await http_client.get(f"{ml_url}/health")
            if response.status_code == 200:
                return {"status": "healthy", "healthy": True}
            return {"status": "unhealthy", "healthy": False, "code": response.status_code}
    except Exception as e:
        # It's okay if ML service is down for the API to stay up, but we report it
        return {"status": "unhealthy", "healthy": False, "error": str(e)}

async def check_storage():
    try:
        # Check disk usage of the current working directory
        total, used, free = shutil.disk_usage(".")
        return {
            "status": "healthy", 
            "healthy": True, 
            "total_gb": total // (2**30),
            "free_gb": free // (2**30)
        }
    except Exception as e:
        return {"status": "unhealthy", "healthy": False, "error": str(e)}

def get_uptime():
    # Placeholder for simplicity, or use process creation time
    p = psutil.Process()
    create_time = p.create_time()
    return datetime.now().timestamp() - create_time

def get_memory_usage():
    mem = psutil.virtual_memory()
    return {
        "total": mem.total,
        "available": mem.available,
        "percent": mem.percent
    }

def get_cpu_usage():
    return psutil.cpu_percent(interval=None)

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/health/detailed")
async def detailed_health():
    db_status = await check_database()
    ml_status = await check_ml_service()
    storage_status = await check_storage()
    
    checks = {
        "database": db_status,
        "ml_service": ml_status,
        "storage": storage_status
    }
    
    # Determine overall status
    is_healthy = all(c.get("healthy", False) for c in checks.values())
    
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
        "metrics": {
            "uptime_seconds": get_uptime(),
            "memory": get_memory_usage(),
            "cpu_percent": get_cpu_usage()
        }
    }
