import os
from app.core.pki import pki_service
from app.db.database import SessionLocal
from app.db.models import Resume
from app.core.config import settings
from cryptography.fernet import Fernet

PUBLIC_KEY_PATH = "certs/resume_signing_public.pem"
if not os.path.exists(PUBLIC_KEY_PATH):
    print("[ERROR] Resume PKI public key not found on server.")
    exit(1)
with open(PUBLIC_KEY_PATH, "r") as f:
    public_key_pem = f.read()

with SessionLocal() as db:
    resume = db.query(Resume).filter(Resume.file_signature != None).first()
    if not resume:
        print("[ERROR] No signed resume found in DB.")
        exit(1)
    with open(resume.file_path, "rb") as rf:
        encrypted_bytes = rf.read()
    key = settings.RESUME_DECRYPTION_KEY
    content = Fernet(key.encode()).decrypt(encrypted_bytes)
    result = pki_service.verify_resume(content, resume.file_signature, public_key_pem)
    print(f"Resume ID: {resume.id}, Signature valid: {result}")
