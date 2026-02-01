"""Message model representing messages between users about a care order."""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime


class Message(Base):
    """Represents a message sent by a user in the context of a care order."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("care_orders.id"), nullable=False)

    content = Column(String(1000), nullable=False)  # Limited to 1000 chars
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", backref="messages")
    order = relationship("CareOrder", backref="messages")
