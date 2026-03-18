## Resume schemas removed

## This file has been removed as part of the resume module deletion.
"""
Resume module schemas
"""
from pydantic import BaseModel
from datetime import datetime

class ResumeResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    size: int
    mime_type: str
    is_encrypted: bool
    is_primary: bool
    access_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
