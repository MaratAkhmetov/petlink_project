"""
Auth API routes.

Provides authentication endpoints and user authentication dependency.
"""

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth_service import authenticate_user
from app.services.user_service import get_user_by_token
from app.db.database import get_db_session

router = APIRouter(prefix="/auth", tags=["Auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Authenticate user and return JWT token."""
    return await authenticate_user(session, login_data)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db_session)
):
    """
    Dependency to get the current logged-in user by token.
    """
    return await get_user_by_token(session, token)
