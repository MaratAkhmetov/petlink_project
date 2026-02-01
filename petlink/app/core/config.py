from pydantic_settings import BaseSettings
from pydantic import PostgresDsn


class Settings(BaseSettings):
    """
    Application configuration settings.

    Reads settings from environment variables or .env file.
    """
    app_name: str = "PetLink"
    database_url: PostgresDsn
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"  # Optional: specify encoding of the env file


# Singleton settings instance for app-wide usage
settings = Settings()
