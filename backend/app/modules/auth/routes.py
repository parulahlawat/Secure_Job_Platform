
"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Security
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.database import get_db
from app.db.models import User, UserRole, Profile, OTPLog
from app.modules.auth.schemas import (
    UserCreate, UserResponse, LoginRequest, 
    OTPRequest, OTPVerify, TokenResponse, ProfileCreate, ForgotPasswordRequest, ResetPasswordRequest
)
from app.modules.auth.jwt import jwt_service
from app.modules.auth.otp import otp_service
from app.core.encryption import encryption_service
from app.core.config import settings
from app.core.sendgrid_email import sendgrid_email_service

router = APIRouter()


# --- Dependency to get current user from token ---
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Extract user from JWT token in Authorization header"""
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ")[1]
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token"
        )
    payload = jwt_service.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

# --- Admin API: Fetch login/logout logs ---
@router.get("/admin/login-logs")
async def get_login_logout_logs(
    db: Session = Depends(get_db),
    current_user: User = Security(get_current_user)
):
    """Admin: Get login/logout logs for users and recruiters"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.db.models import AuditLog, User
    logs = (
        db.query(AuditLog, User)
        .join(User, AuditLog.user_id == User.id)
        .filter(AuditLog.action.in_(["login_success", "logout"]))
        .order_by(AuditLog.created_at.desc())
        .limit(200)
        .all()
    )
    result = []
    for log, user in logs:
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "action": log.action,
            "details": log.details,
            "timestamp": log.created_at.isoformat(),
        })
    return result

"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.database import get_db
from app.db.models import User, UserRole, Profile, OTPLog
from app.modules.auth.schemas import (
    UserCreate, UserResponse, LoginRequest, 
    OTPRequest, OTPVerify, TokenResponse, ProfileCreate, ForgotPasswordRequest, ResetPasswordRequest
)
from app.modules.auth.jwt import jwt_service
from app.modules.auth.otp import otp_service
from app.core.encryption import encryption_service
from app.core.config import settings
from app.core.sendgrid_email import sendgrid_email_service



# --- Forgot Password: Send OTP ---
@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send OTP to user's email for password reset (forgot password)"""
    from app.core.audit_log import log_action
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        log_action(db, None, "forgot_password_user_not_found", "user", {"email": request.email})
        raise HTTPException(status_code=404, detail="User not found")
    otp = otp_service.create_otp(db, request.email)
    log_action(db, user.id, "forgot_password_otp_generated", "user", {"email": request.email, "otp": otp})
    try:
        email_sent = await sendgrid_email_service.send_otp_email(request.email, otp, user.full_name)
        if not email_sent:
            raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again or contact support.")
    except Exception as e:
        log_action(db, user.id, "forgot_password_otp_email_error", "user", {"email": request.email, "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again or contact support.")
    return {"message": "OTP sent to your email"}

# --- Forgot Password: Reset Password ---
@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using OTP sent to email"""
    from app.core.audit_log import log_action
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        log_action(db, None, "reset_password_user_not_found", "user", {"email": request.email})
        raise HTTPException(status_code=404, detail="User not found")
    if not otp_service.verify_otp(db, request.email, request.otp):
        log_action(db, user.id, "reset_password_otp_failed", "user", {"email": request.email})
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    # Hash new password (bcrypt)
    password_hash, password_salt = encryption_service.hash_password(request.new_password)
    user.password_hash = password_hash
    user.password_salt = password_salt
    db.commit()
    log_action(db, user.id, "reset_password_success", "user", {"email": request.email})
    return {"message": "Password reset successful"}



# Dependency to get current user from token

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Extract user from JWT token in Authorization header"""
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ")[1]
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token"
        )
    payload = jwt_service.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

import inspect
async def get_current_admin(request: Request = None, db: Session = Depends(get_db)):
    """Dependency to enforce admin role (case-insensitive, async)"""
    if request is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing request")
    user = None
    if hasattr(request, 'headers'):
        # get_current_user may be async
        if inspect.iscoroutinefunction(get_current_user):
            user = await get_current_user(request, db)
        else:
            user = get_current_user(request, db)
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing headers")
    role = getattr(user, 'role', None)
    from app.db.models import UserRole
    is_admin = (
        role == UserRole.ADMIN or
        str(role).lower() == 'admin'
    )
    if not user or not role or not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    import traceback
    from app.core.audit_log import log_action
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            log_action(db, None, "register_failed", "user", {"email": user_data.email, "reason": "already registered"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        # Hash password (bcrypt)
        password_hash, password_salt = encryption_service.hash_password(user_data.password)
        # Determine role
        from app.db.models import UserRole
        # Hardcode admin for specific email
        if user_data.email.lower() == "parulahlawat19298@gmail.com":
            role = 'admin'
        else:
            role = user_data.role.lower() if user_data.role else 'user'
            if role not in ['user', 'admin', 'recruiter']:
                role = 'user'
        user_role = UserRole(role)
        # Ensure full_name is not empty
        full_name = user_data.full_name.strip() if user_data.full_name and user_data.full_name.strip() else user_data.email.split('@')[0].capitalize()

        # Generate encryption keypair for the user using PyNaCl
        import nacl.public, base64
        private_key = nacl.public.PrivateKey.generate()
        public_key = base64.b64encode(bytes(private_key.public_key)).decode()
        secret_key = base64.b64encode(bytes(private_key)).decode()
        # Save secret_key to localStorage on frontend after registration (frontend responsibility)

        # Create user (set is_verified=False until OTP is verified)
        user = User(
            email=user_data.email,
            full_name=full_name,
            password_hash=password_hash,
            password_salt=password_salt,
            role=user_role,
            is_verified=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        # Create profile with public_key and company_name if recruiter
        profile_kwargs = dict(user_id=user.id, public_key=public_key)
        if role == 'recruiter' and hasattr(user_data, 'company_name') and user_data.company_name:
            profile_kwargs['company_name'] = user_data.company_name
        profile = Profile(**profile_kwargs)
        db.add(profile)
        db.commit()
        log_action(db, user.id, "register_success", "user", {"email": user_data.email, "role": role})

        # Send OTP to email for verification
        from app.modules.auth.otp import otp_service
        from app.core.sendgrid_email import sendgrid_email_service
        otp = otp_service.create_otp(db, user.email)
        await sendgrid_email_service.send_otp_email(user.email, otp, user.full_name)

        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
            "public_key": public_key,
            "secret_key": secret_key,
            "otp_sent": True
        }
    except Exception as e:
        print("Registration error:", e)
        print(traceback.format_exc())
        log_action(db, None, "register_error", "user", {"email": user_data.email, "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/request-otp")
async def request_otp(request: OTPRequest, db: Session = Depends(get_db)):
    print("request_otp called", flush=True)
    """Request OTP for login/verification - creates user if doesn't exist"""
    from app.core.audit_log import log_action
    user = db.query(User).filter(User.email == request.email).first()
    new_user_created = False
    # If user doesn't exist, create one for OTP-only login
    if not user:
        from app.db.models import UserRole
        user = User(
            email=request.email,
            full_name=request.email.split('@')[0],  # Use email prefix as name
            password_hash="",  # No password for OTP-only users
            password_salt="",
            role=UserRole.USER,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        # Always create a Profile with a generated public key for new OTP users
        import nacl.public, base64
        private_key = nacl.public.PrivateKey.generate()
        public_key = base64.b64encode(bytes(private_key.public_key)).decode()
        profile = Profile(user_id=user.id, public_key=public_key)
        db.add(profile)
        db.commit()
        new_user_created = True
        print(f"✅ New user created via OTP: {request.email}")
        log_action(db, user.id, "otp_user_created", "user", {"email": request.email})
    else:
        # If user exists but has no profile, create one (legacy fix)
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if not profile:
            import nacl.public, base64
            private_key = nacl.public.PrivateKey.generate()
            public_key = base64.b64encode(bytes(private_key.public_key)).decode()
            profile = Profile(user_id=user.id, public_key=public_key)
            db.add(profile)
            db.commit()
    otp = otp_service.create_otp(db, request.email)
    # Show OTP in logs for testing if DEBUG is enabled
    if settings.DEBUG:
        print(f"\n{'='*60}")
        print(f"🔐 OTP for {request.email}")
        print(f"{'='*60}")
        print(f"OTP: {otp}")
        print(f"{'='*60}\n")
    else:
        print(f"📧 OTP for {request.email}: {otp}")
    try:
        email_sent = await sendgrid_email_service.send_otp_email(request.email, otp, user.full_name)
        print(f"✉️  SendGrid email sent: {email_sent}")
        log_action(db, user.id, "otp_requested", "user", {"email": request.email, "email_sent": email_sent})
        if not email_sent:
            raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again or contact support.")
    except Exception as e:
        print(f"❌ SendGrid email error: {str(e)}")
        import traceback
        traceback.print_exc()
        log_action(db, user.id, "otp_email_error", "user", {"email": request.email, "error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again or contact support.")
    # Always hide OTP from response for security
    return {"message": "OTP sent to email", "email": request.email}

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(request: OTPVerify, db: Session = Depends(get_db)):
    """Verify OTP and return tokens"""
    from app.core.audit_log import log_action
    if not otp_service.verify_otp(db, request.email, request.otp):
        log_action(db, None, "otp_verify_failed", "user", {"email": request.email})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        log_action(db, None, "otp_verify_user_not_found", "user", {"email": request.email})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.is_verified = True
    db.commit()
    access_token, refresh_token = jwt_service.create_tokens(user.id, user.email)
    log_action(db, user.id, "otp_verify_success", "user", {"email": request.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": 60 * 30  # 30 minutes
    }

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not encryption_service.verify_password(
        credentials.password, 
        user.password_hash, 
        user.password_salt
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        attempt.locked_until = None
        db.commit()
    if not user.is_active:
        # Audit logging removed
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    access_token, refresh_token = jwt_service.create_tokens(user.id, user.email)
    # Audit logging removed
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": 60 * 30
    }

@router.get("/debug/otp/{email}")
async def get_otp_debug(email: str, db: Session = Depends(get_db)):
    """DEBUG ONLY: Get the OTP for testing purposes. Remove in production!"""
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only available in DEBUG mode"
        )
    
    otp_log = db.query(OTPLog).filter(
        OTPLog.email == email,
        OTPLog.is_used == False
    ).order_by(OTPLog.created_at.desc()).first()
    
    if not otp_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active OTP found for this email"
        )
    
    # For debugging, we'll try to find the OTP by checking all stored OTPs
    # This is a security risk and should only be used in development
    return {
        "message": "OTP retrieved (DEBUG MODE - REMOVE IN PRODUCTION)",
        "email": email,
        "otp_expires_in_minutes": int((otp_log.expires_at.timestamp() - datetime.now(timezone.utc).timestamp()) / 60),
        "note": "Check your email or ask the developer for the OTP - it was printed to the server console when requested"
    }

from fastapi import Request
@router.get("/me", response_model=UserResponse)
async def get_current_user_info(request: Request, db: Session = Depends(get_db)):
    """Get current user info"""
    user = await get_current_user(request, db)
    # Get public_key from profile
    profile = db.query(Profile).filter(Profile.user_id == user.id).first()
    public_key = profile.public_key if profile else None
    # Never return secret_key after registration
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at,
        "public_key": public_key,
        "secret_key": "",
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(old_token: str, db: Session = Depends(get_db)):
    """Refresh access token"""
    payload = jwt_service.verify_token(old_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    access_token, refresh_token = jwt_service.create_tokens(user.id, user.email)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": 60 * 30
    }


from fastapi import Request, Depends
from app.db.database import get_db
from app.db.models import User
from app.modules.auth.jwt import jwt_service
import jwt

@router.post("/logout")
async def logout(request: Request, db: Session = Depends(get_db)):
    """Logout (token invalidation handled by client) and log the action"""
    auth_header = request.headers.get("authorization")
    user = None
    if auth_header:
        token = auth_header.split(" ")[-1]
        try:
            payload = jwt_service.decode_access_token(token)
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
        except Exception:
            pass
    if user:
        from app.core.audit_log import log_action
        log_action(db, user.id, "logout", "user", {"email": user.email, "role": user.role.value})
    return {"message": "Logged out successfully"}



