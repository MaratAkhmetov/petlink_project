"""
CareOrder schemas.

Defines data structures for creating, reading, and updating care orders.
"""

from pydantic import BaseModel, constr
from enum import Enum
from datetime import datetime
from typing import Optional

from app.schemas.user import UserPublic


class OrderStatus(str, Enum):
    """Possible statuses for a care order."""
    open = "open"
    in_progress = "in_progress"
    completed = "completed"
    canceled = "canceled"


class CareOrderBase(BaseModel):
    """Base schema shared by care order input and output."""
    title: constr(min_length=3, max_length=100)
    description: Optional[constr(max_length=1000)] = None
    start_date: datetime
    end_date: datetime
    status: OrderStatus = OrderStatus.open


class CareOrderCreate(CareOrderBase):
    """Schema for creating a new care order."""
    # All fields inherited from base


class CareOrderRead(CareOrderBase):
    """Schema for reading care order information."""
    id: int
    owner_id: int
    owner: UserPublic
    created_at: datetime

    class Config:
        from_attributes = True


class CareOrderUpdate(BaseModel):
    """
    Schema for updating a care order.

    All fields are optional. Partial updates are allowed.
    """
    title: Optional[constr(min_length=3, max_length=100)] = None
    description: Optional[constr(max_length=1000)] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[OrderStatus] = None
