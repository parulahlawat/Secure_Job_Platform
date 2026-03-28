from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class DeletedAccount(Base):
    __tablename__ = "deleted_accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    deleted_at = Column(DateTime, default=datetime.utcnow)
    details = Column(Text, nullable=True)
