from fastapi import APIRouter
from features import registry

router = APIRouter()


@router.get("/features")
async def list_features():
    """Return all available features (metadata only, no pipeline internals)."""
    return {"features": registry.get_all()}
