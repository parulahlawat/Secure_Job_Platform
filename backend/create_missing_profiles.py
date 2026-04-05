"""
One-time script to create missing Profiles for all Users who do not have one.
Generates a new public key for each missing profile.
Run: python create_missing_profiles.py
"""

from app.db.database import SessionLocal
from app.db.models import User, Profile
import nacl.public, base64


def create_missing_profiles():
    db = SessionLocal()
    users = db.query(User).all()
    created = 0
    for user in users:
        profile = db.query(Profile).filter(Profile.user_id == user.id).first()
        if not profile:
            private_key = nacl.public.PrivateKey.generate()
            public_key = base64.b64encode(bytes(private_key.public_key)).decode()
            profile = Profile(user_id=user.id, public_key=public_key)
            db.add(profile)
            created += 1
    db.commit()
    db.close()
    print(f"Created {created} missing profiles.")

if __name__ == "__main__":
    create_missing_profiles()
