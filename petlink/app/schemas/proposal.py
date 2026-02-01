"""
Proposal schemas.

Defines data validation and transfer objects for proposal operations.
"""

from typing import Optional
from pydantic import BaseModel, condecimal
from enum import Enum


class ProposalStatus(str, Enum):
    """Available proposal statuses."""
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    canceled = "canceled"


class ProposalBase(BaseModel):
    """Base schema shared by proposal input and output."""
    price: condecimal(gt=0)
    comment: Optional[str] = None


class ProposalCreate(ProposalBase):
    """Schema for proposal creation."""
    order_id: int
    petsitter_id: int


class ProposalRead(ProposalBase):
    """Schema for reading proposal information."""
    id: int
    status: ProposalStatus

    class Config:
        from_attributes = True


class ProposalUpdate(BaseModel):
    """
    Schema for updating proposal information.

    All fields are optional.
    """
    price: Optional[condecimal(gt=0)] = None
    comment: Optional[str] = None
    status: Optional[ProposalStatus] = None
