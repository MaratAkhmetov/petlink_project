"""
Auth schemas.

Defines data validation and transfer objects for authentication.
"""

from pydantic import BaseModel, constr


class LoginRequest(BaseModel):
    """
    Schema for user login request.

    Contains username and password fields.
    """
    username: constr(min_length=3, max_length=50)
    password: constr(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    """
    Schema for JWT token response.

    Contains access token and token type (usually 'bearer').
    """
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """
    Schema for the token payload data.

    Typically includes user ID and token expiration.
    """
    sub: int | None = None  # user ID
    exp: int | None = None  # expiration timestamp
