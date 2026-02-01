"""
User service.

Handles user creation, retrieval, updates, and user fetching by token.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status

from jose import JWTError, jwt
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.core.security import hash_password


def to_user_read(user: User) -> UserRead:
    """Convert User ORM object to UserRead schema, excluding hashed_password."""
    return UserRead(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        owner_rating=user.owner_rating,
        petsitter_rating=user.petsitter_rating,
    )


async def create_user(session: AsyncSession, user_data: UserCreate) -> UserRead:
    """Create a new user."""
    result = await session.execute(
        select(User).where(User.username == user_data.username, User.is_deleted == False)
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        is_deleted=False,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return to_user_read(new_user)


async def get_user_by_id(session: AsyncSession, user_id: int) -> UserRead:
    """Retrieve user by ID, ignoring deleted users."""
    result = await session.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return to_user_read(user)


async def get_user_entity_by_id(session: AsyncSession, user_id: int) -> User:
    """Return raw User ORM object (including password)"""
    result = await session.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def update_user(session: AsyncSession, user_id: int, user_data: UserUpdate) -> UserRead:
    """Update user fields."""
    result = await session.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_data.username is not None:
        user.username = user_data.username
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.role is not None:
        user.role = user_data.role
    if user_data.password is not None:
        user.hashed_password = hash_password(user_data.password)

    await session.commit()
    await session.refresh(user)
    return to_user_read(user)


async def update_user_rating(
    session: AsyncSession,
    user_id: int,
    new_rating: float,
    rater_role: UserRole,
) -> User:
    """Update the user's rating based on who rates them."""
    result = await session.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role == UserRole.owner and rater_role == UserRole.petsitter:
        user.owner_rating = new_rating
    elif user.role == UserRole.petsitter and rater_role == UserRole.owner:
        user.petsitter_rating = new_rating
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid rating operation")

    await session.commit()
    await session.refresh(user)
    return user


async def get_user_by_token(session: AsyncSession, token: str) -> User:
    """Decode JWT token and fetch user by ID."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await session.execute(select(User).where(User.id == int(user_id), User.is_deleted == False))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def delete_user(session: AsyncSession, user_id: int) -> bool:
    """Soft-delete user by setting is_deleted=True."""
    result = await session.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalars().first()
    if not user:
        return False

    await session.execute(
        update(User)
        .where(User.id == user_id)
        .values(is_deleted=True)
    )
    await session.commit()
    return True
