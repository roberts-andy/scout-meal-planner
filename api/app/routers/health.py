from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.cosmosdb import check_database_connection

router = APIRouter()


@router.get("/health")
async def health():
    try:
        await check_database_connection()
        return {"status": "healthy"}
    except Exception:
        return JSONResponse({"status": "unhealthy"}, status_code=503)
