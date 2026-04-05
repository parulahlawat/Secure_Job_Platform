#!/usr/bin/env python3
"""
Check integrity of all user public keys in the FCS database.
Prints a summary of missing or duplicate public keys.
"""
import os
import sys
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker
from app.db.models import Profile, User
from app.db.database import engine

Session = sessionmaker(bind=engine)
session = Session()

def main():
    profiles = session.query(Profile, User).join(User, Profile.user_id == User.id).all()
    missing = []
    empty = []
    key_map = {}
    for profile, user in profiles:
        pk = profile.public_key
        if pk is None:
            missing.append((user.email, profile.user_id))
        elif not pk.strip():
            empty.append((user.email, profile.user_id))
        else:
            key_map.setdefault(pk, []).append(user.email)
    print(f"Total profiles: {len(profiles)}")
    print(f"Profiles with missing public_key: {len(missing)}")
    for email, uid in missing:
        print(f"  - {email} (user_id={uid}) has missing public_key")
    print(f"Profiles with empty public_key: {len(empty)}")
    for email, uid in empty:
        print(f"  - {email} (user_id={uid}) has empty public_key")
    # Check for duplicate keys
    dups = {k: v for k, v in key_map.items() if len(v) > 1}
    print(f"Duplicate public_key values: {len(dups)}")
    for pk, emails in dups.items():
        print(f"  - Key {pk[:12]}... used by: {', '.join(emails)}")
    if not missing and not empty and not dups:
        print("All profiles have unique, non-empty public keys. Integrity OK.")

if __name__ == "__main__":
    main()
