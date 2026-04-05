"""
Force all users to reset their password by setting must_reset_password=True and clearing password_hash and salt fields.
"""
from app.db.database import SessionLocal
from app.db.models import User

def force_all_users_password_reset():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            user.must_reset_password = True
            user.password_hash = None
            if hasattr(user, 'salt'):
                user.salt = None
        db.commit()
        print(f"Updated {len(users)} users: must_reset_password set, hashes cleared.")
    finally:
        db.close()

if __name__ == "__main__":
    force_all_users_password_reset()
