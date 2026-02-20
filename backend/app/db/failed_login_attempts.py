from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.db.models import Base

class FailedLoginAttempt(Base):
    __tablename__ = "failed_login_attempts"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    count = Column(Integer, default=0)
    last_attempt = Column(DateTime, default=datetime.utcnow)
    locked_until = Column(DateTime, nullable=True)
    
    def is_locked(self):
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False
