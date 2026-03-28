"""
Audit logging module routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import AuditLog, UserRole
from app.modules.audit.schemas import AuditLogResponse
from app.modules.audit.blockchain_verify import router as blockchain_router
from app.modules.auth.routes import get_current_user


from fastapi import APIRouter
router = APIRouter()
router.include_router(blockchain_router, prefix="/blockchain", tags=["BlockchainAudit"])

@router.get("/", response_model=list[AuditLogResponse])
async def get_audit_logs(
    token: str,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get audit logs (admin only)"""
    user = await get_current_user(token, db)
    
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = db.query(AuditLog).offset(skip).limit(limit).order_by(
        AuditLog.created_at.desc()
    ).all()
    
    return logs

@router.get("/user/{user_id}", response_model=list[AuditLogResponse])
async def get_user_audit_logs(
    user_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """Get audit logs for specific user"""
    current_user = await get_current_user(token, db)
    
    # Users can only see their own logs, admins can see all
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == user_id
    ).order_by(AuditLog.created_at.desc()).all()
    
    return logs
