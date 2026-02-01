"""
Message schemas.

Defines data validation and transfer objects for messages in chat.
"""

from pydantic import BaseModel, constr
from datetime import datetime


class UserRead(BaseModel):
    id: int
    username: str


class MessageBase(BaseModel):
    """Base schema shared by message input and output."""
    content: constr(min_length=1, max_length=1000)
    # Limit content length to 1000 chars


class MessageCreate(MessageBase):
    """Schema for creating a new message."""
    sender_id: int
    order_id: int


class MessageRead(MessageBase):
    """Schema for reading message data."""
    id: int
    sender: UserRead
    order_id: int
    created_at: datetime

    class Config:
        from_attributes = True
