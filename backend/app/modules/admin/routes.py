
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Profile, Job, JobApplication, Resume, ResumeAccessLog, Message, Connection
from app.modules.deleted.models import DeletedAccount
from app.modules.auth.routes import get_current_admin
from app.core.audit_log import log_action

router = APIRouter(tags=["admin"])

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    # Delete all connections where user is sender or receiver
    db.query(Connection).filter((Connection.sender_id == user_id) | (Connection.receiver_id == user_id)).delete()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Store deleted user info
    deleted_info = DeletedAccount(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=str(user.role),
        details=None
    )
    db.add(deleted_info)

    # Delete related Profile
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile:
        # Delete recruiter's jobs if any
        jobs = db.query(Job).filter(Job.recruiter_id == profile.id).all()
        for job in jobs:
            # Delete job applications for this job
            db.query(JobApplication).filter(JobApplication.job_id == job.id).delete()
            db.delete(job)
        db.delete(profile)

    # Delete job applications by user
    db.query(JobApplication).filter(JobApplication.user_id == user_id).delete()

    # Delete resumes and access logs
    resumes = db.query(Resume).filter(Resume.user_id == user_id).all()
    for resume in resumes:
        db.query(ResumeAccessLog).filter(ResumeAccessLog.resume_id == resume.id).delete()
        db.delete(resume)

    # Delete messages sent or received by user
    db.query(Message).filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).delete()

    db.delete(user)
    db.commit()
    log_action(db, admin.id if hasattr(admin, 'id') else None, "admin_delete_user", "user", {"deleted_user_id": user_id})


# Example: log admin moderation actions (add more as needed)
@router.post("/moderate/job/{job_id}/status")
async def moderate_job_status(job_id: int, status: str, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    old_status = job.status if hasattr(job, 'status') else None
    job.status = status
    db.commit()
    db.refresh(job)
    log_action(db, admin.id if hasattr(admin, 'id') else None, "admin_moderate_job_status", "job", {
        "job_id": job_id,
        "old_status": old_status,
        "new_status": status
    })
    return {"success": True, "job_id": job_id, "status": status}
    return

@router.get("/recruiter/{user_id}/jobs")
async def get_recruiter_jobs(user_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    jobs = db.query(Job).filter(Job.recruiter_id == profile.id).all()
    log_action(db, admin.id if hasattr(admin, 'id') else None, "admin_view_recruiter_jobs", "job", {"recruiter_user_id": user_id, "job_count": len(jobs)})
    return [
        {
            "id": job.id,
            "title": job.title,
            "location": job.location,
            "status": job.status.value if hasattr(job.status, 'value') else str(job.status),
            "created_at": job.created_at,
            "is_active": job.is_active
        }
        for job in jobs
    ]

@router.get("/users")
async def get_all_users(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    users = db.query(User).all()
    log_action(db, admin.id if hasattr(admin, 'id') else None, "admin_view_users", "user", {"count": len(users)})
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "registered_at": user.created_at,
            "is_verified": user.is_verified,
            "is_active": user.is_active
        }
        for user in users
    ]
