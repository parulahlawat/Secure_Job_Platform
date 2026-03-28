from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ConnectionCreate(BaseModel):
    receiver_id: int

class ConnectionAction(BaseModel):
    connection_id: int
    accept: bool

class ConnectionResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
