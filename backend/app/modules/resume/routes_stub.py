from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/my-resumes")
async def get_my_resumes():
    return JSONResponse(content=[])
