import os
from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response
from pydantic import BaseModel

from app.models.user import User
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

AVATAR_DIR = "static/avatars"
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}

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


@router.post("/{user_id}/avatar")
async def upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
):
    # 1. Проверяем пользователя
    result = await session.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Проверка типа файла
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")

    # 3. Читаем файл и проверяем размер
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # 4. Создаём папку если нет
    os.makedirs(AVATAR_DIR, exist_ok=True)

    # Удаляем предыдущий аватар, если есть
    if user.avatar_url:
        old_path = user.avatar_url.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    # 5. Сохраняем файл
    file_extension = file.filename.split(".")[-1]
    file_path = f"{AVATAR_DIR}/user_{user_id}.{file_extension}"

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # 6. Обновляем URL
    user.avatar_url = f"/static/avatars/user_{user_id}.{file_extension}"

    await session.commit()
    await session.refresh(user)

    return user


@router.delete("/{user_id}/avatar")
async def delete_avatar(
    user_id: int,
    session: AsyncSession = Depends(get_db_session),
):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.avatar_url:
        file_path = user.avatar_url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)

    user.avatar_url = None
    await session.commit()
    await session.refresh(user)

    return {"message": "Avatar deleted"}
