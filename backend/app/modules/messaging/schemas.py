"""
Messaging module schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


from typing import List

class MessageCreate(BaseModel):
    recipient_id: Optional[int] = None  # For direct messages
    group_id: Optional[int] = None      # For group messages
    ciphertext: str  # E2EE encrypted message

class GroupCreate(BaseModel):
    name: str
    member_ids: List[int]

class GroupResponse(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: datetime
    members: List[int]

from typing import Dict

class GroupMessageCreate(BaseModel):
    group_id: int
    ciphertexts: Dict[int, str]  # user_id -> ciphertext

class GroupMessageResponse(BaseModel):
    id: int
    group_id: int
    sender_id: int
    ciphertext: str
    created_at: datetime
    sender_public_key: Optional[str]

class MessageResponse(MessageCreate):
    id: int
    sender_id: int
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime]
    
    class Config:
        from_attributes = True
