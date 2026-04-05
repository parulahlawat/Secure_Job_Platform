
"""
Script to update recruiter profiles with missing company_name fields.
Sets a default or placeholder company name if missing.
"""

import os
import sys
import pathlib
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import sessionmaker
from app.db.database import engine
from app.db.models import Profile, UserRole


Session = sessionmaker(bind=engine)
session = Session()

def update_missing_company_names(default_name_prefix="Company"):
    recruiters = session.query(Profile).all()
    updated = 0
    for profile in recruiters:
        # Only update recruiters with missing/empty company_name
        if getattr(profile, "company_name", None) in (None, ""):
            # Optionally, use user's email or id for uniqueness
            profile.company_name = f"{default_name_prefix} {profile.id}"
            updated += 1
    session.commit()
    print(f"Updated {updated} recruiter profiles with missing company_name.")

if __name__ == "__main__":
    update_missing_company_names()
