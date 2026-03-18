## Resume routes removed

## This file has been removed as part of the resume module deletion.
"""
Resume security module routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request, Body
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Resume, User
import json
## Resume parsing removed
from app.modules.resume.schemas import ResumeResponse
from app.modules.auth.routes import get_current_user
import os
import hashlib
from app.modules.auth.otp import otp_service
from app.core.audit_log import log_action
from app.modules.auth.routes import sendgrid_email_service
from app.db.models import User
from app.modules.auth.schemas import OTPRequest, OTPVerify
from fastapi.responses import FileResponse

router = APIRouter()


@router.get("/by_user/{user_id}", response_model=list[ResumeResponse])
async def get_resumes_by_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    """Admin: Get all resumes for a given user_id"""
    user = await get_current_user(request, db)
    if getattr(user, 'role', None) != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    resumes = db.query(Resume).filter(Resume.user_id == user_id).all()
    # PKI: Verify signature for each resume
    from app.core.pki import pki_service
    PUBLIC_KEY_PATH = "certs/resume_signing_public.pem"
    if not os.path.exists(PUBLIC_KEY_PATH):
        raise HTTPException(status_code=500, detail="Resume PKI public key not found on server.")
    with open(PUBLIC_KEY_PATH, "r") as f:
        public_key_pem = f.read()
    for resume in resumes:
        if resume.file_signature:
            try:
                with open(resume.file_path, "rb") as rf:
                    encrypted_bytes = rf.read()
                from app.core.config import settings
                from cryptography.fernet import Fernet
                key = settings.RESUME_DECRYPTION_KEY
                content = Fernet(key.encode()).decrypt(encrypted_bytes)
                if not pki_service.verify_resume(content, resume.file_signature, public_key_pem):
                    print(f"[PKI ERROR] Signature verification failed for resume {resume.id}")
                    raise HTTPException(status_code=400, detail=f"Resume signature verification failed for resume {resume.id}")
            except Exception as e:
                print(f"[PKI EXCEPTION] Resume {resume.id}: {e}")
                raise HTTPException(status_code=400, detail=f"Resume signature verification error for resume {resume.id}: {e}")
    return resumes

@router.get("/my-resumes", response_model=list[ResumeResponse])
async def get_my_resumes(request: Request, db: Session = Depends(get_db)):
    """Get user's resumes"""
    print("[DEBUG] Entered get_my_resumes endpoint")
    user = await get_current_user(request, db)
    print(f"[DEBUG] Got user: {user.id}")
    resumes = db.query(Resume).filter(Resume.user_id == user.id).all()
    print(f"[DEBUG] Retrieved {len(resumes)} resumes from DB for user {user.id}")
    # PKI: Verify signature for each resume
    from app.core.pki import pki_service
    PUBLIC_KEY_PATH = "certs/resume_signing_public.pem"
    if not os.path.exists(PUBLIC_KEY_PATH):
        print("[DEBUG] Resume PKI public key not found on server.")
        raise HTTPException(status_code=500, detail="Resume PKI public key not found on server.")
    with open(PUBLIC_KEY_PATH, "r") as f:
        public_key_pem = f.read()
    print("[DEBUG] Starting PKI verification loop")
    for resume in resumes:
        print(f"[DEBUG] Checking resume {resume.id} for PKI verification")
        if resume.file_signature:
            try:
                with open(resume.file_path, "rb") as rf:
                    encrypted_bytes = rf.read()
                from app.core.config import settings
                from cryptography.fernet import Fernet
                key = settings.RESUME_DECRYPTION_KEY
                content = Fernet(key.encode()).decrypt(encrypted_bytes)
                if not pki_service.verify_resume(content, resume.file_signature, public_key_pem):
                    print(f"[PKI ERROR] Signature verification failed for resume {resume.id}")
                    raise HTTPException(status_code=400, detail=f"Resume signature verification failed for resume {resume.id}")
            except Exception as e:
                print(f"[PKI EXCEPTION] Resume {resume.id}: {e}")
                raise HTTPException(status_code=400, detail=f"Resume signature verification error for resume {resume.id}: {e}")
    print("[DEBUG] Exiting get_my_resumes endpoint, returning resumes")
    return resumes

@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload encrypted resume (parsing removed)"""
    from app.core.audit_log import log_action
    print("[DEBUG] upload_resume endpoint called")
    user = await get_current_user(request, db)
    # Check file type
    if not file.filename.endswith((".pdf", ".doc", ".docx")):
        print(f"[DEBUG] Invalid file type: {file.filename}")
        log_action(db, user.id, "resume_upload_invalid_type", "resume", {"filename": file.filename})
        raise HTTPException(status_code=400, detail="Invalid file type")
    # Read file
    content = await file.read()
    file_size = len(content)
    print(f"[DEBUG] File received: {file.filename}, size: {file_size}")
    if file_size > 10 * 1024 * 1024:  # 10MB
        print(f"[DEBUG] File too large: {file_size}")
        log_action(db, user.id, "resume_upload_too_large", "resume", {"filename": file.filename, "size": file_size})
        raise HTTPException(status_code=400, detail="File too large")
    # Generate file hash for integrity
    file_hash = hashlib.sha256(content).hexdigest()
    # PKI: Sign the resume content with server-side private key
    from app.core.pki import pki_service
    # Load/generate server-side private key (persist in file for real use)
    PRIVATE_KEY_PATH = "certs/resume_signing_private.pem"
    if not os.path.exists(PRIVATE_KEY_PATH):
        priv, pub = pki_service.generate_keypair()
        with open(PRIVATE_KEY_PATH, "w") as f:
            f.write(priv)
        with open("certs/resume_signing_public.pem", "w") as f:
            f.write(pub)
    with open(PRIVATE_KEY_PATH, "r") as f:
        private_key_pem = f.read()
    file_signature = pki_service.sign_resume(content, private_key_pem)

    # Encrypt file content using AES-256
    from app.core.config import settings
    from cryptography.fernet import Fernet
    key = settings.RESUME_DECRYPTION_KEY
    encrypted_bytes = Fernet(key.encode()).encrypt(content)
    # Save encrypted file
    os.makedirs("uploads/resumes", exist_ok=True)
    file_path = f"uploads/resumes/{user.id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(encrypted_bytes)
    print(f"[DEBUG] Encrypted file saved: {file_path}")
    # Resume parsing removed
    resume = Resume(
        user_id=user.id,
        filename=file.filename,
        file_path=file_path,
        file_hash=file_hash,
        file_signature=file_signature,
        size=file_size,
        mime_type=file.content_type,
        is_encrypted=True,
        encryption_key_hash=hashlib.sha256(key.encode()).hexdigest(),
        parsed_data=None
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    print(f"[DEBUG] Resume DB entry created: {resume.id}")
    log_action(db, user.id, "resume_uploaded", "resume", {"resume_id": resume.id, "filename": file.filename})
    print("[DEBUG] upload_resume endpoint completed successfully")
    return resume
# Endpoint: match resumes to jobs (simple skill overlap)
## Resume parsing and matching removed

@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete resume"""
    from app.core.audit_log import log_action
    user = await get_current_user(request, db)
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume or resume.user_id != user.id:
        log_action(db, user.id, "resume_delete_forbidden", "resume", {"resume_id": resume_id})
        raise HTTPException(status_code=403, detail="Not authorized")
    # Check if resume is used in any job application
    from app.db.models import JobApplication, Job
    used_applications = db.query(JobApplication).filter(JobApplication.resume_id == resume_id).all()
    if used_applications:
        # Gather job info for all jobs this resume is used in
        job_infos = []
        for app in used_applications:
            job = db.query(Job).filter(Job.id == app.job_id).first()
            if job:
                job_infos.append({"id": job.id, "title": job.title})
        raise HTTPException(
            status_code=400,
            detail={
                "message": "You have applied to job(s) using this resume. It cannot be deleted.",
                "jobs": job_infos
            }
        )
    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)
    db.delete(resume)
    db.commit()
    log_action(db, user.id, "resume_deleted", "resume", {"resume_id": resume_id, "filename": resume.filename})
    return {"message": "Resume deleted"}

@router.post("/request-download-otp/{resume_id}")
async def request_resume_download_otp(
    resume_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Send OTP to recruiter's email for resume download"""
    user = await get_current_user(request, db)
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    # Only recruiters can download resumes
    if getattr(user, 'role', None) != 'recruiter':
        raise HTTPException(status_code=403, detail="Only recruiters can download resumes")
    otp = otp_service.create_otp(db, user.email)
    log_action(db, user.id, "resume_download_otp_generated", "resume", {"resume_id": resume_id, "email": user.email, "otp": otp})
    try:
        email_sent = await sendgrid_email_service.send_otp_email(user.email, otp, user.full_name)
        if not email_sent:
            raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again or contact support.")
    except Exception as e:
        log_action(db, user.id, "resume_download_otp_email_error", "resume", {"resume_id": resume_id, "email": user.email, "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again or contact support.")
    return {"message": "OTP sent to your email"}

@router.post("/verify-download-otp/{resume_id}")
async def verify_resume_download_otp(
    resume_id: int,
    otp_data: OTPVerify = Body(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Verify OTP before allowing resume download"""
    user = await get_current_user(request, db)
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if getattr(user, 'role', None) != 'recruiter':
        raise HTTPException(status_code=403, detail="Only recruiters can download resumes")
    if not otp_service.verify_otp(db, user.email, otp_data.otp, mark_used=False):
        log_action(db, user.id, "resume_download_otp_failed", "resume", {"resume_id": resume_id, "email": user.email})
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    log_action(db, user.id, "resume_download_otp_success", "resume", {"resume_id": resume_id, "email": user.email})
    return {"message": "OTP verified. You may now download the resume."}

@router.get("/download/{resume_id}")
async def download_resume(
    resume_id: int,
    otp: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Download resume after OTP verification"""
    user = await get_current_user(request, db)
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if getattr(user, 'role', None) != 'recruiter':
        raise HTTPException(status_code=403, detail="Only recruiters can download resumes")
    if not otp_service.verify_otp(db, user.email, otp, mark_used=True):
        log_action(db, user.id, "resume_download_otp_failed", "resume", {"resume_id": resume_id, "email": user.email})
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    log_action(db, user.id, "resume_download_success", "resume", {"resume_id": resume_id, "email": user.email})
    # Decrypt file before sending
    from app.core.config import settings
    from cryptography.fernet import Fernet
    key = settings.RESUME_DECRYPTION_KEY
    with open(resume.file_path, "rb") as f:
        encrypted_bytes = f.read()
    content = Fernet(key.encode()).decrypt(encrypted_bytes)
    temp_path = f"/tmp/{user.id}_{resume.filename}"
    with open(temp_path, "wb") as f:
        f.write(content)
    response = FileResponse(temp_path, filename=resume.filename, media_type=resume.mime_type)
    return response
