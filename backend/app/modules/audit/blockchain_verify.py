from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.blockchain_log import verify_blockchain_integrity

router = APIRouter()

@router.get("/blockchain-verify")
async def blockchain_verify(db: Session = Depends(get_db)):
    """Verify blockchain log integrity."""
    ok, idx = verify_blockchain_integrity(db)
    if ok:
        return {"status": "ok"}
    else:
        raise HTTPException(status_code=500, detail=f"Blockchain log broken at block {idx}")
