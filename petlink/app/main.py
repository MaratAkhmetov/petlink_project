from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware  # <-- импортируем CORS middleware
from sqlalchemy.exc import IntegrityError

from app.api import auth, users, care_orders, proposals, chat

app = FastAPI(title="PetLink API")

# Разрешённые источники (React dev сервер)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Подключаем CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # разрешаем запросы с этих адресов
    allow_credentials=True,
    allow_methods=["*"],            # разрешаем все методы (GET, POST, и т.д.)
    allow_headers=["*"],            # разрешаем все заголовки
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(care_orders.router)
app.include_router(proposals.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    """Root endpoint returning a welcome message."""
    return {"message": "Welcome to PetLink API!"}


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """
    Global exception handler for SQLAlchemy IntegrityError.
    Catches database integrity violations (such as unique constraint failures)
    and returns a 409 Conflict response with a meaningful error message.
    """
    detail = "Integrity constraint violated"

    if 'unique constraint' in str(exc.orig):
        if 'ix_users_username' in str(exc.orig):
            detail = "Username already exists"
        elif 'ix_users_email' in str(exc.orig):
            detail = "Email already exists"
        else:
            detail = "Unique constraint failed"

    return JSONResponse(
        status_code=409,
        content={"detail": detail}
    )
