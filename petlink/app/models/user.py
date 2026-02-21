"""User model definition."""

from sqlalchemy import Boolean, Column, Integer, String, Enum, Float, Text
from app.models.base import Base
import enum


class UserRole(enum.Enum):
    """Enumeration of possible user roles."""
    owner = "owner"
    petsitter = "petsitter"


class User(Base):
    """Represents a system user: owner or petsitter."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    # Must be explicitly selected on registration

    # Rating given by petsitters
    owner_rating = Column(Float, default=0.0, nullable=False)

    # Rating given by owners
    petsitter_rating = Column(Float, default=0.0, nullable=False)

    is_deleted = Column(Boolean, default=False, nullable=False)

    avatar_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    pets = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    city = Column(Text, nullable=True)