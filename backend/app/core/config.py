"""
Configuration management for the application
"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # App
    APP_NAME: str = "FCS - Secure Job Portal"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://user:password@localhost:5432/fcs_db"
    )
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-secret-in-env-file")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Email
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SENDER_EMAIL: str = os.getenv("SENDER_EMAIL", "noreply@fcs.com")

    # SendGrid
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://yourdomain.com"
    ]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "yourdomain.com"]
    
    # File Storage
    FILE_UPLOAD_DIR: str = os.getenv("FILE_UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    ALLOWED_RESUME_EXTENSIONS: List[str] = [".pdf", ".doc", ".docx"]
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Encryption
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    RESUME_DECRYPTION_KEY: str = os.getenv("RESUME_DECRYPTION_KEY", "")
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
