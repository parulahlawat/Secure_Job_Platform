from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
import os
import json
from app.modules.auth.routes import get_current_admin

router = APIRouter(prefix="/admin/movements", tags=["Admin Movements"])

MOVEMENTS_DIR = os.path.join(os.path.dirname(__file__), "../../movements")

@router.get("/", response_class=JSONResponse)
def list_movements(current_user=Depends(get_current_admin)):
    """List all admin movement logs (latest first)."""
    logs = []
    try:
        files = [f for f in os.listdir(MOVEMENTS_DIR) if f.endswith(".json")]
        files.sort(reverse=True)
        for fname in files:
            with open(os.path.join(MOVEMENTS_DIR, fname)) as f:
                logs.append(json.load(f))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return logs
