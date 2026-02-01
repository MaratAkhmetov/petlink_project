from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response
from pydantic import BaseModel

from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user_service import (
    create_user,
    get_user_by_id,
    update_user,
    delete_user,
    get_user_entity_by_id,
)
from app.db.database import get_db_session
from app.core.security import verify_password

router = APIRouter(prefix="/users", tags=["Users"])


class UserDeleteRequest(BaseModel):
    password: str


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, session: AsyncSession = Depends(get_db_session)) -> UserRead:
    """Register a new user."""
    return await create_user(session, user_data)


@router.get("/{user_id}", response_model=UserRead)
async def read_user(user_id: int, session: AsyncSession = Depends(get_db_session)) -> UserRead:
    """Retrieve user by ID."""
    return await get_user_by_id(session, user_id)


@router.patch("/{user_id}", response_model=UserRead)
async def update_profile(user_id: int, user_data: UserUpdate, session: AsyncSession = Depends(get_db_session)) -> UserRead:
    """Update user profile data."""
    return await update_user(session, user_id, user_data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    user_id: int,
    delete_data: UserDeleteRequest,
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    """Delete user profile with password confirmation."""
    user = await get_user_entity_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(delete_data.password, user.hashed_password):
        raise HTTPException(status_code=403, detail="Incorrect password")

    await delete_user(session, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
