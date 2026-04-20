from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.cosmosdb import init_database

router = APIRouter()


@router.get("/health")
async def health():
    try:
        await init_database()
        return {"status": "healthy"}
    except Exception:
        return JSONResponse({"status": "unhealthy"}, status_code=503)
