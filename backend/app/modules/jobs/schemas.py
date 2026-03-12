"""
Jobs module schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.db.models import JobStatus, ApplicationStatus

class JobCreate(BaseModel):
    title: str
    description: str
    location: str
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    job_type: str
    experience_level: str
    application_deadline: datetime

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None

class JobResponse(JobCreate):
    id: int
    recruiter_id: int
    status: JobStatus
    is_active: bool
    created_at: datetime
    updated_at: datetime
    application_deadline: datetime
    company_name: Optional[str] = None

    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    user_id: int
    resume_id: Optional[int] = None
    status: ApplicationStatus
    cover_letter: Optional[str]
    applied_at: datetime
    updated_at: datetime
    # Enriched fields
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    experience_years: Optional[int] = None
    skills: Optional[str] = None
    resume: Optional[str] = None

    class Config:
        from_attributes = True

class JobApplicationCreate(BaseModel):
    resume_id: int = Field(..., description="ID of the resume to attach to this application")
    cover_letter: Optional[str] = None
