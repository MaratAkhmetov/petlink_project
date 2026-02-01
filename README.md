PetLink — это онлайн-сервис, который помогает владельцам животных находить проверенных петситтеров для передержки.
Пользователи могут создавать заказы на уход за питомцем, получать предложения от исполнителей и общаться в чате.

MVP-версия включает регистрацию пользователей с ролями, создание заказов и предложений, а также базовый чат между владельцем и исполнителем.


PetLink is an online platform that connects pet owners with trusted pet sitters for temporary care.
Users can create care orders, receive proposals from sitters, and communicate directly via chat.

The MVP version includes user registration with roles, order and proposal management, and a simple chat between owner and sitter.

🐾 PetLink — Локальный запуск (Backend + Frontend)

Этот репозиторий содержит backend (FastAPI + PostgreSQL) и frontend (React) приложения PetLink.

Инструкция ниже описывает полный локальный запуск проекта с нуля.

📦 Требования

Перед началом убедись, что у тебя установлено:

Обязательно

Git

Docker и Docker Compose

Python >= 3.11

Node.js >= 18 (включает npm)

Проверка версий
python3 --version
node --version
npm --version
docker --version
docker compose version

📁 Структура проекта (упрощённо)
petlink/
├── petlink/                 # Backend (FastAPI)
│   ├── app/                 # API, модели, сервисы
│   ├── alembic/             # Миграции БД
│   ├── docker-compose.yml   # PostgreSQL (Docker)
│   ├── requirements.txt
│   ├── .env                 # переменные окружения (локально)
│
├── petlink-frontend/        # Frontend (React)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── package-lock.json
│
└── README.md                # Общая инструкция по запуску проекта

🚀 Backend (FastAPI)
1️⃣ Клонирование репозитория
git clone <URL_РЕПОЗИТОРИЯ>
cd petlink

2️⃣ Создание виртуального окружения Python
python3 -m venv venv
source venv/bin/activate     # macOS / Linux
# venv\Scripts\activate      # Windows


Обнови pip:

pip install --upgrade pip

3️⃣ Установка Python-зависимостей
pip install -r requirements.txt


Если позже добавляется новая зависимость (пример):

pip install psycopg2-binary
pip freeze > requirements.txt

4️⃣ Запуск PostgreSQL через Docker

В корне проекта:

docker-compose up -d db


Проверка, что контейнер запущен:

docker ps


Подключение к БД:

docker exec -it petlink-db-1 psql -U petlink_user -d petlink_db


Проверка:

\dt

5️⃣ Настройка переменных окружения (.env)

Создай файл .env в корне проекта:

DATABASE_URL=postgresql+asyncpg://petlink_user:petlink_pass@localhost:5432/petlink_db
SECRET_KEY=your_super_secret_key

6️⃣ Миграции базы данных (Alembic)
📌 Важно

Alembic использует:

DATABASE_URL из .env

Base.metadata из app.models

6.1. Проверка наличия папки versions
ls alembic/versions


Если папки нет:

mkdir -p alembic/versions

6.2. Создание миграции (если модели менялись)
alembic revision --autogenerate -m "Initial migration"

6.3. Применение миграций
alembic upgrade head

6.4. Проверка результата
docker exec -it petlink-db-1 psql -U petlink_user -d petlink_db

\dt


Ожидаемые таблицы:

users

care_orders

proposals

messages

alembic_version

7️⃣ Запуск backend-сервера
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


Backend доступен на:

API: http://localhost:8000

Swagger: http://localhost:8000/docs

Redoc: http://localhost:8000/redoc

🎨 Frontend (React)

Frontend находится в папке petlink-frontend.

8️⃣ Установка Node.js зависимостей

Перейди в папку фронтенда:

cd petlink-frontend


Установи зависимости:

npm install

9️⃣ Запуск frontend
npm start


Frontend откроется автоматически на:

http://localhost:3000

🔗 Связь frontend ↔ backend

Связь настраивается через package.json фронтенда:

"proxy": "http://127.0.0.1:8000"


Это означает:

frontend делает запросы на /auth, /users, и т.д.

React dev server автоматически проксирует их на backend

CORS-проблем нет в dev-режиме

✅ Как проверить, что всё работает вместе

Backend запущен на :8000

Frontend запущен на :3000

Открой frontend в браузере

Выполни действие (логин / регистрация)

В DevTools → Network убедись:

запросы идут на 127.0.0.1:8000

ответы приходят от FastAPI

🧠 Полезные команды

Остановить БД:

docker-compose down


Полный перезапуск БД (⚠️ удалит данные):

docker-compose down -v
docker-compose up -d db

📌 Примечания

Backend использует asyncpg

PostgreSQL работает только в Docker

Frontend и backend запускаются в разных терминалах

Для production потребуется отдельная настройка env и сборки