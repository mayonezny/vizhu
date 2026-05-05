# ВИЖУ — монорепо

```
viju/
├── infra/      — docker-compose, nginx, CI/CD, скрипты
├── api/        — NestJS основной бэкенд
├── pwa/        — React/Vite PWA
└── ai/         — FastAPI AI-микросервис
```

## Быстрый старт (локально)

```bash
cp infra/.env.example infra/.env
# заполни .env

docker compose -f infra/docker-compose.yml \
               -f infra/docker-compose.dev.yml up --build
```

Приложение: http://localhost  
API docs: http://localhost/api  
AI docs: http://localhost:8000/docs (только dev, не торчит наружу в проде)

## Первый деплой на сервер

См. `infra/README.md`
