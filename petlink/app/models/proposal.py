"""Proposal model representing a petsitter's offer for a care order."""

from sqlalchemy import (Column,
                        Integer,
                        String,
                        ForeignKey,
                        DateTime,
                        Enum,
                        Float)
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime


class ProposalStatus(enum.Enum):
    """Enumeration for proposal status."""
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    canceled = "canceled"


class Proposal(Base):
    """Represents a proposal made by a petsitter for a care order."""
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)

    order_id = Column(Integer, ForeignKey("care_orders.id"), nullable=False)
    petsitter_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    price = Column(Float, nullable=False)
    comment = Column(String(500), nullable=True)

    status = Column(Enum(ProposalStatus),
                    default=ProposalStatus.pending,
                    nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("CareOrder", backref="proposals")
    petsitter = relationship("User", backref="proposals")
