"""
OTP service for email-based authentication
"""
import random
import string
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.models import OTPLog
from app.core.encryption import encryption_service

class OTPService:
    """Email-based OTP management"""
    
    LENGTH = 6
    VALIDITY_MINUTES = 10
    MAX_ATTEMPTS = 3
    
    @staticmethod
    def generate_otp() -> str:
        """Generate a random 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=OTPService.LENGTH))
    
    @staticmethod
    def create_otp(db: Session, email: str) -> str:
        """Create and store OTP"""
        otp = OTPService.generate_otp()
        otp_hash, otp_salt = encryption_service.hash_password(otp)
        
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTPService.VALIDITY_MINUTES)
        
        # Delete old OTPs for this email
        db.query(OTPLog).filter(OTPLog.email == email, OTPLog.is_used == False).delete()
        
        otp_log = OTPLog(
            email=email,
            otp_hash=otp_hash,
            otp_salt=otp_salt,
            attempts=0,
            is_used=False,
            expires_at=expires_at
        )
        db.add(otp_log)
        db.commit()
        db.refresh(otp_log)
        
        return otp  # Return plain OTP to send via email
    
    @staticmethod
    def verify_otp(db: Session, email: str, otp: str, mark_used: bool = False) -> bool:
        """Verify OTP. If mark_used is True, mark OTP as used on success."""
        otp_log = db.query(OTPLog).filter(
            OTPLog.email == email,
            OTPLog.is_used == False,
            OTPLog.expires_at > datetime.now(timezone.utc)
        ).order_by(OTPLog.created_at.desc()).first()
        
        if not otp_log:
            print(f"❌ No valid OTP found for {email}")
            return False
        
        print(f"📝 OTP Log found - Attempts: {otp_log.attempts}, Expires: {otp_log.expires_at}")
        
        # Check attempts
        if otp_log.attempts >= OTPService.MAX_ATTEMPTS:
            print(f"❌ Max attempts exceeded")
            return False
        
        # Verify OTP
        is_valid = encryption_service.verify_password(otp, otp_log.otp_hash, otp_log.otp_salt)
        print(f"🔐 OTP verification result: {is_valid}, Provided OTP: {otp}")
        
        if is_valid:
            if mark_used:
                otp_log.is_used = True
                db.commit()
                print(f"✅ OTP verified and marked as used")
            else:
                print(f"✅ OTP verified (not marked as used)")
            return True
        
        otp_log.attempts += 1
        db.commit()
        print(f"❌ OTP verification failed, attempts now: {otp_log.attempts}")
        return False

otp_service = OTPService()
