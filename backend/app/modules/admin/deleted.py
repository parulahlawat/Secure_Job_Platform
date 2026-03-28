from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.modules.deleted.models import DeletedAccount

router = APIRouter(tags=["admin-deleted"])

@router.get("/deleted-accounts")
async def get_deleted_accounts(db: Session = Depends(get_db)):
    accounts = db.query(DeletedAccount).order_by(DeletedAccount.deleted_at.desc()).all()
    return [
        {
            "id": acc.id,
            "user_id": acc.user_id,
            "email": acc.email,
            "full_name": acc.full_name,
            "role": acc.role,
            "deleted_at": acc.deleted_at,
            "details": acc.details
        }
        for acc in accounts
    ]
