"""CareOrder model representing a pet care order."""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime, timezone


class OrderStatus(enum.Enum):
    """Enumeration for order status."""
    open = "open"
    in_progress = "in_progress"
    completed = "completed"
    canceled = "canceled"


class CareOrder(Base):
    """Model for a pet care order created by an owner."""

    __tablename__ = "care_orders"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)

    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)

    status = Column(Enum(OrderStatus),
                    default=OrderStatus.open, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    owner = relationship("User", backref="care_orders")
