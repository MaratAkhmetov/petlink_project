from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
# Здесь можно хранить конфигурацию, например DATABASE_URL

DATABASE_URL = str(settings.database_url)
# Например, "postgresql+asyncpg://user:pass@localhost/dbname"

# Создаем асинхронный движок
engine = create_async_engine(DATABASE_URL, echo=True)

# Создаем сессию для работы с БД (асинхронную)
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


# Функция для получения сессии в зависимостях FastAPI
async def get_db_session():
    async with AsyncSessionLocal() as session:
        yield session
