

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Profile, Job, Connection, UserRole
from app.modules.profiles.schemas import ProfileCreate, ProfileUpdate, ProfileResponse

router = APIRouter()


# Endpoint to get all user profiles except admins (for messaging selection)
@router.get("/", response_model=list[ProfileResponse])
async def get_all_profiles(db: Session = Depends(get_db)):
    """Get all user profiles except admins (for messaging), including user full_name and email."""
    profiles = (
        db.query(Profile, User)
        .join(User, Profile.user_id == User.id)
        .filter(User.role != "admin")
        .all()
    )
    result = []
    for profile, user in profiles:
        result.append({
            'id': profile.id,
            'user_id': profile.user_id,
            'full_name': user.full_name,
            'email': user.email,
            'bio': profile.bio,
            'bio_privacy': profile.bio_privacy,
            'location': profile.location,
            'location_privacy': profile.location_privacy,
            'skills': profile.skills,
            'skills_privacy': profile.skills_privacy,
            'experience_years': profile.experience_years,
            'experience_privacy': profile.experience_privacy,
            'website': profile.website,
            'website_privacy': profile.website_privacy,
            'is_public': profile.is_public,
            'public_key': profile.public_key,
            'created_at': profile.created_at,
            'updated_at': profile.updated_at,
            'job_applications': []
        })
    return result

# Endpoint to search user profiles by email or name
from typing import Optional

@router.get("/search", response_model=list[ProfileResponse])
async def search_profiles(q: Optional[str] = None, db: Session = Depends(get_db)):
    """Search user profiles by email or full_name (case-insensitive, partial match). If q is empty, return []."""
    if not q:
        return []
    profiles = (
        db.query(Profile, User)
        .join(User, Profile.user_id == User.id)
        .filter(User.role != "admin")
        .filter(
            (User.email.ilike(f"%{q}%")) |
            (User.full_name.ilike(f"%{q}%"))
        )
        .all()
    )
    result = []
    for profile, user in profiles:
        result.append({
            'id': profile.id,
            'user_id': profile.user_id,
            'full_name': user.full_name,
            'email': user.email,
            'bio': profile.bio,
            'bio_privacy': profile.bio_privacy,
            'location': profile.location,
            'location_privacy': profile.location_privacy,
            'skills': profile.skills,
            'skills_privacy': profile.skills_privacy,
            'experience_years': profile.experience_years,
            'experience_privacy': profile.experience_privacy,
            'website': profile.website,
            'website_privacy': profile.website_privacy,
            'is_public': profile.is_public,
            'public_key': profile.public_key,
            'created_at': profile.created_at,
            'updated_at': profile.updated_at,
            'job_applications': []
        })
    return result

# Endpoint for recruiter/company admin to create a company page
@router.post("/companies", response_model=ProfileResponse)
async def create_company_profile(
    profile_data: ProfileCreate,
    db: Session = Depends(get_db)
):
    """Create a new company profile (recruiter)"""
    from app.core.pki import pki_service
    # Generate a self-signed certificate for the company
    company_name = profile_data.company_name or "Company"
    certificate_pem = pki_service.create_certificate_chain(company_name)
    profile_dict = profile_data.dict()
    profile_dict["certificate"] = certificate_pem
    profile = Profile(**profile_dict)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

# Endpoint to update a company profile
@router.put("/companies/{profile_id}", response_model=ProfileResponse)
async def update_company_profile(
    profile_id: int,
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing company profile (recruiter)"""
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")
    for key, value in profile_data.dict(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


# Endpoint to get all company profiles (recruiters)
@router.get("/companies", response_model=list[ProfileResponse])
async def get_company_profiles(db: Session = Depends(get_db)):
    """Get all company profiles (recruiters)"""
    profiles = db.query(Profile).filter(Profile.company_name != None).all()
    return profiles

# Endpoint to get jobs posted by a company profile
@router.get("/company/{profile_id}/jobs")
async def get_company_jobs(profile_id: int, db: Session = Depends(get_db)):
    """Get all jobs posted by a company profile"""
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")
    jobs = db.query(Job).filter(Job.recruiter_id == profile_id).all()
    return jobs


import logging
from app.modules.auth.routes import get_current_user


# Robust endpoint to get and update the current user's profile with all fields
@router.get("/me/full", response_model=ProfileResponse)
async def get_my_profile_full(request: Request, db: Session = Depends(get_db)):
    """Get current user's full profile (robust)"""
    user = await get_current_user(request, db)
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    # Ensure all fields are present
    for field in ProfileResponse.__fields__:
        if not hasattr(profile, field):
            setattr(profile, field, None)
    return profile

@router.put("/me/full", response_model=ProfileResponse)
async def update_my_profile_full(
    request: Request,
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update current user's full profile (robust)"""
    user = await get_current_user(request, db)
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for key, value in profile_data.dict(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile

@router.post("/me", response_model=ProfileResponse)
async def update_my_profile(
    request: Request,
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    try:
        user = await get_current_user(request, db)
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        logging.info(f"Before update: {profile.__dict__}")
        for key, value in profile_data.dict(exclude_unset=True).items():
            setattr(profile, key, value)
        db.commit()
        db.refresh(profile)
        logging.info(f"After update: {profile.__dict__}")
        return profile
    except Exception as e:
        logging.exception(f"Profile update failed: {e}")
        raise

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(request: Request, db: Session = Depends(get_db)):
    """Get current user's profile"""
    try:
        user = await get_current_user(request, db)
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        # Get job applications for this user
        from app.db.models import JobApplication, Job
        applications = db.query(JobApplication).filter(JobApplication.user_id == user.id).all()
        job_applications = []
        for app in applications:
            job = db.query(Job).filter(Job.id == app.job_id).first()
            job_applications.append({
                'application_id': app.id,
                'job_id': app.job_id,
                'job_title': getattr(job, 'title', ''),
                'status': app.status,
                'applied_at': app.applied_at,
                'updated_at': app.updated_at
            })
        # Attach job_applications to profile response
        profile_dict = profile.__dict__.copy()
        profile_dict['job_applications'] = job_applications
        return profile_dict
    except Exception as e:
        logging.exception(f"Get profile failed: {e}")
        raise






def is_connection(viewer_id, profile_user_id, db):
    if viewer_id is None:
        return False
    conn = db.query(Connection).filter(
        ((Connection.sender_id == viewer_id) & (Connection.receiver_id == profile_user_id) |
         (Connection.sender_id == profile_user_id) & (Connection.receiver_id == viewer_id)),
        Connection.status == "accepted"
    ).first()
    return conn is not None

@router.get("/by_user/{user_id}", response_model=ProfileResponse)
async def get_profile_by_user_id(user_id: int, request: Request, db: Session = Depends(get_db)):
    """Get user profile by user_id, enforcing privacy controls"""
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    user = db.query(User).filter(User.id == user_id).first()
    # Determine viewer
    viewer = None
    try:
        viewer = await get_current_user(request, db)
    except Exception:
        viewer = None
    is_owner = viewer and viewer.id == user_id
    is_admin = viewer and getattr(viewer, "role", None) == UserRole.ADMIN
    is_conn = viewer and is_connection(viewer.id, user_id, db)
    def field_value(value, privacy):
        if privacy == "public":
            return value
        if privacy == "connections" and is_conn:
            return value
        if privacy == "private" and (is_owner or is_admin):
            return value
        return None

    # Get job applications for this user
    from app.db.models import JobApplication, Job
    job_applications = []
    if user:
        applications = db.query(JobApplication).filter(JobApplication.user_id == user.id).all()
        for app in applications:
            job = db.query(Job).filter(Job.id == app.job_id).first()
            job_applications.append({
                'application_id': app.id,
                'job_id': app.job_id,
                'job_title': getattr(job, 'title', ''),
                'status': app.status,
                'applied_at': app.applied_at,
                'updated_at': app.updated_at
            })

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from datetime import datetime
    now = datetime.utcnow()
    # If profile is missing, return all required fields with correct types
    if not profile:
        return ProfileResponse(
            id=0,
            user_id=user_id,
            full_name=user.full_name if user else None,
            email=user.email if user else None,
            bio=None,
            bio_privacy='public',
            location=None,
            location_privacy='public',
            skills=None,
            skills_privacy='public',
            experience_years=None,
            experience_privacy='public',
            website=None,
            website_privacy='public',
            is_public=True,
            public_key=None,
            created_at=now,
            updated_at=now,
            job_applications=[],
            company_name=None,
            industry=None
        )
    # If profile exists, return as before
    safe_job_applications = job_applications if isinstance(job_applications, list) else []
    return ProfileResponse(
        id=profile.id,
        user_id=user_id,
        full_name=user.full_name if user and hasattr(user, 'full_name') else None,
        email=user.email if user and hasattr(user, 'email') else None,
        bio=profile.bio if profile and hasattr(profile, 'bio') else None,
        bio_privacy=profile.bio_privacy if profile and hasattr(profile, 'bio_privacy') else 'public',
        location=profile.location if profile and hasattr(profile, 'location') else None,
        location_privacy=profile.location_privacy if profile and hasattr(profile, 'location_privacy') else 'public',
        skills=profile.skills if profile and hasattr(profile, 'skills') else None,
        skills_privacy=profile.skills_privacy if profile and hasattr(profile, 'skills_privacy') else 'public',
        experience_years=profile.experience_years if profile and hasattr(profile, 'experience_years') else None,
        experience_privacy=profile.experience_privacy if profile and hasattr(profile, 'experience_privacy') else 'public',
        website=profile.website if profile and hasattr(profile, 'website') else None,
        website_privacy=profile.website_privacy if profile and hasattr(profile, 'website_privacy') else 'public',
        is_public=profile.is_public if profile and hasattr(profile, 'is_public') else True,
        public_key=profile.public_key if profile and hasattr(profile, 'public_key') else None,
        created_at=profile.created_at if profile and hasattr(profile, 'created_at') else now,
        updated_at=profile.updated_at if profile and hasattr(profile, 'updated_at') else now,
        job_applications=safe_job_applications,
        company_name=getattr(profile, 'company_name', None) if profile and hasattr(profile, 'company_name') else None,
        industry=getattr(profile, 'industry', None) if profile and hasattr(profile, 'industry') else None
    )

    result = {
        'id': profile.id,
        'user_id': profile.user_id,
        'full_name': user.full_name if user else None,
        'email': user.email if user else None,
        'bio': field_value(profile.bio, profile.bio_privacy),
        'bio_privacy': profile.bio_privacy,
        'location': field_value(profile.location, profile.location_privacy),
        'location_privacy': profile.location_privacy,
        'skills': field_value(profile.skills, profile.skills_privacy),
        'skills_privacy': profile.skills_privacy,
        'experience_years': field_value(profile.experience_years, profile.experience_privacy),
        'experience_privacy': profile.experience_privacy,
        'website': field_value(profile.website, profile.website_privacy),
        'website_privacy': profile.website_privacy,
        'is_public': profile.is_public,
        'public_key': profile.public_key,
        'created_at': profile.created_at,
        'updated_at': profile.updated_at,
        'job_applications': job_applications,
        'company_name': getattr(profile, 'company_name', None),
        'industry': getattr(profile, 'industry', None)
    }
    return result

# Place the dynamic profile_id route last to avoid shadowing static routes
@router.get("/{profile_id}", response_model=ProfileResponse)
@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(profile_id: int, request: Request, db: Session = Depends(get_db)):
    """Get user profile with privacy enforcement"""
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    user = db.query(User).filter(User.id == profile.user_id).first()
    viewer = None
    try:
        viewer = await get_current_user(request, db)
    except Exception:
        viewer = None
    is_owner = viewer and viewer.id == profile.user_id
    is_admin = viewer and getattr(viewer, "role", None) == UserRole.ADMIN
    is_conn = viewer and is_connection(viewer.id, profile.user_id, db)
    def field_value(value, privacy):
        if privacy == "public":
            return value
        if privacy == "connections" and is_conn:
            return value
        if privacy == "private" and (is_owner or is_admin):
            return value
        return None
    result = {
        'id': profile.id,
        'user_id': profile.user_id,
        'full_name': user.full_name if user else None,
        'email': user.email if user else None,
        'bio': field_value(profile.bio, profile.bio_privacy),
        'bio_privacy': profile.bio_privacy,
        'location': field_value(profile.location, profile.location_privacy),
        'location_privacy': profile.location_privacy,
        'skills': field_value(profile.skills, profile.skills_privacy),
        'skills_privacy': profile.skills_privacy,
        'experience_years': field_value(profile.experience_years, profile.experience_privacy),
        'experience_privacy': profile.experience_privacy,
        'website': field_value(profile.website, profile.website_privacy),
        'website_privacy': profile.website_privacy,
        'is_public': profile.is_public,
        'public_key': profile.public_key,
        'created_at': profile.created_at,
        'updated_at': profile.updated_at,
    }
    return result

@router.post("/me", response_model=ProfileResponse)
async def update_my_profile(
    request: Request,
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    try:
        user = await get_current_user(request, db)
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        logging.info(f"Before update: {profile.__dict__}")
        for key, value in profile_data.dict(exclude_unset=True).items():
            setattr(profile, key, value)
        db.commit()
        db.refresh(profile)
        logging.info(f"After update: {profile.__dict__}")
        return profile
    except Exception as e:
        logging.exception(f"Profile update failed: {e}")
        raise

from fastapi import Request

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(request: Request, db: Session = Depends(get_db)):
    """Get current user's profile"""
    try:
        user = await get_current_user(request, db)
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        return profile
    except Exception as e:
        logging.exception(f"Get profile failed: {e}")
        raise
