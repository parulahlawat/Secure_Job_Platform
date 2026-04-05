from dotenv import load_dotenv
import os

# Load .env file for DATABASE_URL and other settings
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))
"""
Script to promote a user to admin and log the action in AuditLog (PostgreSQL backend)
"""
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, AuditLog
from datetime import datetime
import socket
import hashlib
import json

# Utility: promote user to admin and log

def promote_user_to_admin_and_log(email: str, db: Session, ip_address: str = "127.0.0.1", user_agent: str = "script"):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise Exception(f"User with email {email} not found")
    if user.role == "admin":
        print(f"User {email} is already admin.")
        return
    old_role = user.role
    user.role = "admin"
    db.commit()
    db.refresh(user)
    # Prepare audit log
    details = json.dumps({"old_role": old_role, "new_role": "admin", "email": email})
    log_string = f"{user.id}|promote_to_admin|user|{details}|{ip_address}|{user_agent}|{datetime.utcnow().isoformat()}"
    log_hash = hashlib.sha256(log_string.encode()).hexdigest()
    audit = AuditLog(
        user_id=user.id,
        action="promote_to_admin",
        resource="user",
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
        previous_hash=None,  # Optional: chain if needed
        log_hash=log_hash,
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    print(f"User {email} promoted to admin and action logged.")

if __name__ == "__main__":
    import sys
    from app.db.database import SessionLocal
    if len(sys.argv) < 2:
        print("Usage: python promote_admin_and_log.py <user_email>")
        sys.exit(1)
    email = sys.argv[1]
    db = SessionLocal()
    try:
        promote_user_to_admin_and_log(email, db)
    finally:
        db.close()
