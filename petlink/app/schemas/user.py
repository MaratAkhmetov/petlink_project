"""
User schemas.

Defines data validation and transfer objects for user operations.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, constr
from enum import Enum


class UserRole(str, Enum):
    """Available user roles."""
    owner = "owner"
    petsitter = "petsitter"


class UserBase(BaseModel):
    """Base schema shared by user input and output."""
    username: constr(min_length=3, max_length=50)
    email: EmailStr
    role: UserRole


class UserCreate(UserBase):
    """Schema for user registration. Includes password."""
    password: constr(min_length=8, max_length=128)


class UserRead(UserBase):
    """Schema for reading user information (excluding password)."""
    id: int
    owner_rating: float
    petsitter_rating: float

    class Config:
        orm_mode = True  # <-- исправлено с from_attributes на orm_mode


class UserUpdate(BaseModel):
    """
    Schema for updating user information.

    All fields are optional.
    Password update should be handled separately with proper security checks.
    """
    username: Optional[constr(min_length=3, max_length=50)] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    password: Optional[constr(min_length=8, max_length=128)] = None



class UserPublic(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True
