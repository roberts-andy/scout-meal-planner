from fastapi import APIRouter

from app.feature_flags import ALL_FEATURE_FLAGS, is_feature_enabled

router = APIRouter()


@router.get("/feature-flags")
async def get_feature_flags():
    return {flag_name: is_feature_enabled(flag_name) for flag_name in ALL_FEATURE_FLAGS}
