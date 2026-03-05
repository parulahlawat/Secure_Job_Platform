"""
Profiles module schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProfileCreate(BaseModel):
    bio: Optional[str] = None
    bio_privacy: Optional[str] = 'public'
    location: Optional[str] = None
    location_privacy: Optional[str] = 'public'
    skills: Optional[str] = None
    skills_privacy: Optional[str] = 'public'
    experience_years: Optional[int] = None
    experience_privacy: Optional[str] = 'public'
    website: Optional[str] = None
    website_privacy: Optional[str] = 'public'
    is_public: bool = True
    public_key: Optional[str] = None
    certificate: Optional[str] = None  # Company PKI certificate (PEM)

class ProfileUpdate(ProfileCreate):
    public_key: Optional[str] = None
    certificate: Optional[str] = None

from typing import List, Dict, Any

class ProfileResponse(BaseModel):
    id: Optional[int] = None
    user_id: Optional[int] = None
    bio: Optional[str] = None
    bio_privacy: Optional[str] = 'public'
    location: Optional[str] = None
    location_privacy: Optional[str] = 'public'
    skills: Optional[str] = None
    skills_privacy: Optional[str] = 'public'
    experience_years: Optional[int] = None
    experience_privacy: Optional[str] = 'public'
    website: Optional[str] = None
    website_privacy: Optional[str] = 'public'
    is_public: Optional[bool] = True
    public_key: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    job_applications: Optional[List[Dict[str, Any]]] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    certificate: Optional[str] = None

    class Config:
        from_attributes = True
