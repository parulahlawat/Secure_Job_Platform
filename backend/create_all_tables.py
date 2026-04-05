import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.db.database import engine
from app.db import models

if __name__ == "__main__":
    print("Creating all tables in PostgreSQL using SQLAlchemy models...")
    models.Base.metadata.create_all(bind=engine)
    print("All tables created successfully.")
