
import os
import sys
import base64
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from app.db.models import User, Profile
from nacl.public import PrivateKey
from dotenv import load_dotenv


# Ensure 'app' is importable regardless of working directory
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

# Load environment variables
load_dotenv()

# Adjust this to your actual database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/fcs')

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def generate_keypair():
    sk = PrivateKey.generate()
    pk = sk.public_key
    return base64.b64encode(pk.encode()).decode('utf-8')

users = session.query(User).all()
for user in users:
    profile = session.query(Profile).filter(Profile.user_id == user.id).first()
    if profile and not profile.public_key:
        public_key = generate_keypair()
        profile.public_key = public_key
        print(f"Set public_key for user {user.email} (profile id {profile.id})")
        session.add(profile)
session.commit()
print("Done updating old users with public_key.")
