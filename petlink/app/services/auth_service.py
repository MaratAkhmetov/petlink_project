from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt

from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password
from app.core.config import settings


async def authenticate_user(session: AsyncSession, login_data: LoginRequest) -> TokenResponse:
    """Authenticate user and return JWT token."""
    result = await session.execute(select(User).where(User.username == login_data.username))
    user = result.scalars().first()

    # ⛔️ Проверка: пользователь не найден или soft-deleted
    if not user or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not verify_password(login_data.password, user.hashed_password):  # type: ignore[arg-type]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


def create_access_token(subject: str) -> str:
    """
    Create a JWT access token with user id as subject.
    """
    from datetime import datetime, timedelta

    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {"exp": expire, "sub": subject}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt
