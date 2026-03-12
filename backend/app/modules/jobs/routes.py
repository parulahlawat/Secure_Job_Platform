
"""
Jobs module routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import FileResponse, Response
import os
from app.core.encryption import encryption_service
from cryptography.fernet import Fernet
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.models import Resume, Message, Job, JobApplication, User, UserRole, Profile
from app.db.database import get_db
from app.modules.jobs.schemas import JobCreate, JobUpdate, JobResponse, ApplicationResponse, JobApplicationCreate
from app.modules.auth.routes import get_current_user
from app.modules.messaging.schemas import MessageResponse

router = APIRouter()

# --- Recruiter to applicant messages for a job application ---
@router.get("/{job_id}/applications/{applicant_id}/recruiter-messages", response_model=list[MessageResponse])
async def get_recruiter_messages_for_application(job_id: int, applicant_id: int, request: Request, db: Session = Depends(get_db)):
    """Get all messages sent by the recruiter for this job to the applicant (for JobDetail view)"""
    user = await get_current_user(request, db)
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # Only recruiter or the applicant can view
    if user.role == UserRole.RECRUITER and user.profile.id != job.recruiter_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.role == UserRole.USER and user.id != applicant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    recruiter = db.query(User).join(Profile).filter(Profile.id == job.recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    # Get all messages from recruiter to applicant
    messages = db.query(Message).filter(
        Message.sender_id == recruiter.id,
        Message.recipient_id == applicant_id
    ).order_by(Message.created_at.asc()).all()
    return messages

# --- Resume download for recruiters ---

@router.get("/resume/{resume_id}/download")
async def download_resume(resume_id: int, request: Request, db: Session = Depends(get_db)):
    print("[DEBUG] Entered download_resume endpoint")
    """Allow recruiter to download applicant's resume file by resume_id, decrypting if needed"""
    user = await get_current_user(request, db)
    # Only recruiters and admins can download resumes
    if user.role not in [UserRole.RECRUITER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    file_path = resume.file_path
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Resume file missing on server")
    filename = resume.filename
    # Decrypt if needed
    if resume.is_encrypted:
        import sys
        print(f"[DEBUG] About to decrypt file: {file_path}")
        sys.stdout.flush()
        # For demo: fetch key from a secure location or use a placeholder
        # TODO: Replace this with actual key retrieval logic
        from app.core.config import settings
        encryption_key = settings.RESUME_DECRYPTION_KEY
        print(f"[DEBUG] Got encryption key: {bool(encryption_key)}")
        sys.stdout.flush()
        if not encryption_key:
            print("[ERROR] Decryption key not configured on server")
            sys.stdout.flush()
            raise HTTPException(status_code=500, detail="Decryption key not configured on server")
        with open(file_path, "rb") as f:
            encrypted_data = f.read()
        print(f"[DEBUG] Read encrypted file, {len(encrypted_data)} bytes")
        sys.stdout.flush()
        # Decrypt if needed
        if resume.is_encrypted:
            from app.core.config import settings
            from cryptography.fernet import Fernet
            encryption_key = settings.RESUME_DECRYPTION_KEY
            if not encryption_key:
                raise HTTPException(status_code=500, detail="Decryption key not configured on server")
            with open(file_path, "rb") as f:
                encrypted_data = f.read()
            try:
                decrypted_bytes = Fernet(encryption_key.encode()).decrypt(encrypted_data)
            except Exception:
                raise HTTPException(status_code=500, detail="Failed to decrypt resume file")
            return Response(content=decrypted_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
        # If not encrypted, just send the file
        return FileResponse(path=file_path, filename=filename, media_type="application/pdf")

# --- Update job application status ---
class StatusUpdatePayload(BaseModel):
    status: str

@router.put("/applications/{application_id}/status")
async def update_application_status(
    application_id: int,
    payload: StatusUpdatePayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update the status of a job application (recruiter only)"""
    user = await get_current_user(request, db)
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        print(f"[DEBUG] Application id {application_id} not found.")
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(Job).filter(Job.id == application.job_id).first()
    print(f"[DEBUG] Job: {job}")
    if not job:
        print(f"[DEBUG] Job id {application.job_id} not found for application {application_id}.")
        raise HTTPException(status_code=404, detail="Job not found")
    # Only the recruiter who posted the job can update status
    if job.recruiter_id != user.profile.id:
        print(f"[DEBUG] Not authorized: recruiter_id mismatch. Job recruiter_id={job.recruiter_id}, user profile_id={user.profile.id}")
        raise HTTPException(status_code=403, detail="Not authorized")
    # Validate status
    valid_statuses = ["applied", "reviewing", "shortlisted", "rejected", "offered"]
    if payload.status not in valid_statuses:
        print(f"[DEBUG] Invalid status: {payload.status}")
        raise HTTPException(status_code=400, detail="Invalid status")
    old_status = application.status
    application.status = payload.status
    db.commit()
    db.refresh(application)
    # Audit log for status update
    from app.core.audit_log import log_action
    log_action(db, user.id, "application_status_updated", "job_application", {
        "application_id": application.id,
        "job_id": job.id,
        "old_status": old_status,
        "new_status": application.status
    })
    print(f"[DEBUG] Status updated successfully.")
    return {"success": True, "status": application.status}

@router.get("/", response_model=list[JobResponse])
async def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    location: str = None,
    title: str = None,
    recruiter_id: int = None,
    db: Session = Depends(get_db)
):
    """List all open jobs, optionally filter by title, location, or recruiter_id"""
    query = db.query(Job).filter(Job.is_active == True)
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if title:
        query = query.filter(Job.title.ilike(f"%{title}%"))
    if recruiter_id:
        query = query.filter(Job.recruiter_id == recruiter_id)
    jobs = query.offset(skip).limit(limit).all()
    # Attach company_name to each job and return as JobResponse
    from app.modules.jobs.schemas import JobResponse
    result = []
    for job in jobs:
        company_name = None
        if job.recruiter_id:
            profile = db.query(Profile).filter(Profile.id == job.recruiter_id).first()
            if profile:
                company_name = profile.company_name
        job_data = {**job.__dict__, 'company_name': company_name}
        result.append(JobResponse(**job_data))
    return result

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: Session = Depends(get_db)):
    """Get job details"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    company_name = None
    if job.recruiter_id:
        profile = db.query(Profile).filter(Profile.id == job.recruiter_id).first()
        if profile:
            company_name = profile.company_name
    # Build response using JobResponse schema
    from app.modules.jobs.schemas import JobResponse
    job_data = {**job.__dict__, 'company_name': company_name}
    return JobResponse(**job_data)

@router.post("/", response_model=JobResponse)
async def create_job(
    request: Request,
    job_data: JobCreate,
    db: Session = Depends(get_db)
):
    """Create job posting (recruiters only)"""
    from app.core.audit_log import log_action
    user = await get_current_user(request, db)
    if user.role != UserRole.RECRUITER:
        log_action(db, user.id, "job_create_forbidden", "job", {"reason": "not recruiter", "email": user.email})
        raise HTTPException(status_code=403, detail="Only recruiters can post jobs")
    from datetime import datetime
    # Validate deadline is not in the past
    if job_data.application_deadline < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Application deadline cannot be in the past.")
    job = Job(**job_data.dict(), recruiter_id=user.profile.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    log_action(db, user.id, "job_created", "job", {"job_id": job.id, "title": job.title})
    return job

@router.post("/{job_id}/apply", response_model=ApplicationResponse)
async def apply_to_job(
    job_id: int,
    payload: JobApplicationCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Apply to a job with selected resume"""
    from app.core.audit_log import log_action
    user = await get_current_user(request, db)
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        log_action(db, user.id, "job_apply_not_found", "job", {"job_id": job_id})
        raise HTTPException(status_code=404, detail="Job not found")
    existing = db.query(JobApplication).filter(
        JobApplication.job_id == job_id,
        JobApplication.user_id == user.id
    ).first()
    if existing:
        log_action(db, user.id, "job_apply_duplicate", "job", {"job_id": job_id})
        raise HTTPException(status_code=400, detail="Already applied to this job")
    # Validate resume ownership
    resume = db.query(Resume).filter_by(id=payload.resume_id, user_id=user.id).first()
    if not resume:
        raise HTTPException(status_code=400, detail="Invalid resume_id or not owned by user")
    application = JobApplication(
        job_id=job_id,
        user_id=user.id,
        resume_id=payload.resume_id,
        cover_letter=payload.cover_letter
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    log_action(db, user.id, "job_applied", "job", {"job_id": job_id, "application_id": application.id})
    return application

@router.get("/{job_id}/applications", response_model=list[ApplicationResponse])
async def get_applications(
    job_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get applications for a job (recruiter only)"""
    user = await get_current_user(request, db)
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or job.recruiter_id != user.profile.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    applications = db.query(JobApplication).filter(
        JobApplication.job_id == job_id
    ).all()
    import json
    from app.db.models import Resume
    from app.modules.jobs.schemas import ApplicationResponse
    result = []
    for app in applications:
        user_obj = db.query(User).filter(User.id == app.user_id).first()
        profile = db.query(Profile).filter(Profile.user_id == app.user_id).first() if user_obj else None
        resume_obj = db.query(Resume).filter(Resume.user_id == app.user_id).order_by(Resume.created_at.desc()).first()
        parsed_resume = None
        if resume_obj and resume_obj.parsed_data:
            try:
                parsed_resume = json.dumps(json.loads(resume_obj.parsed_data))
            except Exception:
                parsed_resume = resume_obj.parsed_data
        response = ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            user_id=app.user_id,
            resume_id=app.resume_id,
            status=app.status,
            cover_letter=app.cover_letter,
            applied_at=app.applied_at,
            updated_at=app.updated_at,
            user_name=getattr(user_obj, 'full_name', ''),
            user_email=getattr(user_obj, 'email', ''),
            experience_years=getattr(profile, 'experience_years', None),
            skills=getattr(profile, 'skills', ''),
            resume=parsed_resume
        )
        result.append(response)
    return result

# Catch-all route must be last to avoid shadowing specific routes
@router.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def catch_all(full_path: str, request: Request):
    print(f"[DEBUG] Unmatched request: {request.method} {request.url}")
    return {"detail": "Unmatched request", "path": full_path}
