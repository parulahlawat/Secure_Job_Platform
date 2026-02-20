
"""
Database models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Float, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

# ...existing code...

from sqlalchemy.ext.declarative import DeclarativeMeta



"""
Database models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Float, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

# Enums
class UserRole(str, enum.Enum):
    USER = "user"
    RECRUITER = "recruiter"
    ADMIN = "admin"



# Enums
class ConnectionStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"

class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    REVIEWING = "reviewing"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"
    OFFERED = "offered"

class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"
    ARCHIVED = "archived"

# Models


# ...existing code for Profile, Job, etc...

class Connection(Base):
    __tablename__ = "connections"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ConnectionStatus), default=ConnectionStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

# Group messaging models
class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Relationships
    members = relationship("GroupMember", back_populates="group")
    messages = relationship("Message", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User")

# Enums
class UserRole(str, enum.Enum):
    USER = "user"
    RECRUITER = "recruiter"
    ADMIN = "admin"



class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    REVIEWING = "reviewing"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"
    OFFERED = "offered"

class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    CLOSED = "closed"
    ARCHIVED = "archived"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    password_salt = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER)

    @property
    def is_admin(self):
        return self.email == "parulahlawat19298@gmail.com"

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    profile_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False)
    applications = relationship("JobApplication", back_populates="user")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient")
    audit_logs = relationship("AuditLog", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    bio_privacy = Column(String(20), default="public")  # public / connections / private
    location = Column(String(255), nullable=True)
    location_privacy = Column(String(20), default="public")
    # ...existing code...
    skills = Column(Text, nullable=True)
    skills_privacy = Column(String(20), default="public")
    experience_years = Column(Integer, nullable=True)
    experience_privacy = Column(String(20), default="public")
    company_name = Column(String(255), nullable=True)  # For recruiters
    industry = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    website_privacy = Column(String(20), default="public")
    public_key = Column(Text, nullable=True)  # PKI public key for resume signing
    is_public = Column(Boolean, default=True)
    certificate = Column(Text, nullable=True)  # Company PKI certificate (PEM)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    jobs_posted = relationship("Job", back_populates="recruiter")

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    job_type = Column(String(50), nullable=False)  # full-time, part-time, contract
    experience_level = Column(String(50), nullable=False)  # entry, mid, senior
    status = Column(Enum(JobStatus), default=JobStatus.DRAFT)
    is_active = Column(Boolean, default=True)
    application_deadline = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    recruiter = relationship("Profile", back_populates="jobs_posted")
    applications = relationship("JobApplication", back_populates="job")

class JobApplication(Base):
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.APPLIED)
    cover_letter = Column(Text, nullable=True)
    recruiter_notes = Column(Text, nullable=True)  # Internal notes (recruiter only)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)  # Link to selected resume
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    user = relationship("User", back_populates="applications")

class Resume(Base):
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_hash = Column(String(255), nullable=False)  # SHA-256 for integrity
    file_signature = Column(Text, nullable=True)  # RSA signature for PKI verification
    parsed_data = Column(Text, nullable=True)  # JSON: parsed resume info (skills, email, phone, etc)
    size = Column(Integer, nullable=False)
    mime_type = Column(String(50), nullable=False)
    is_encrypted = Column(Boolean, default=True)
    encryption_key_hash = Column(String(255), nullable=True)  # Hash of encryption key (not key itself)
    is_primary = Column(Boolean, default=False)
    access_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    access_logs = relationship("ResumeAccessLog", back_populates="resume")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for group messages
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)  # set for group messages
    ciphertext = Column(Text, nullable=False)  # E2EE encrypted message (only ciphertext stored)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    read_at = Column(DateTime, nullable=True)
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")
    group = relationship("Group", back_populates="messages")
    __table_args__ = (
        Index("idx_recipient_created", "recipient_id", "created_at"),
        Index("idx_group_created", "group_id", "created_at"),
    )

class OTPLog(Base):
    __tablename__ = "otp_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    otp_hash = Column(String(255), nullable=False)
    otp_salt = Column(String(255), nullable=False)  # Salt for OTP hash
    attempts = Column(Integer, default=0)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    resource = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)  # JSON
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(512), nullable=True)
    previous_hash = Column(String(255), nullable=True)  # Hash chain for tamper detection
    log_hash = Column(String(255), nullable=False)  # Hash of this log
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")


class ResumeAccessLog(Base):
    __tablename__ = "resume_access_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    accessed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    access_type = Column(String(50), nullable=False)  # view, download, verify
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(512), nullable=True)
    accessed_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    resume = relationship("Resume", back_populates="access_logs")
    user = relationship("User", foreign_keys=[accessed_by])
