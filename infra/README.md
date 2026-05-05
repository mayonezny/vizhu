# ВИЖУ — Инфраструктура

## Архитектура

```
Internet :80/:443
    ↓
nginx (reverse proxy + SSL)
    ├── /         → pwa:80   (React статика)
    ├── /api/     → api:3000 (NestJS)
    ├── /ws/      → api:3000 (WebSocket)
    └── /rtc/     → api:3000 (WebRTC сигналинг)

frontend_net: nginx ↔ pwa, nginx ↔ api
backend_net:  api ↔ ai ↔ postgres ↔ redis
              (ai снаружи недоступен!)
```

CORS не нужен — всё идёт через один домен vizhu.su.

---

## Локальная разработка

```bash
cp .env.example .env
# заполни .env

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- http://localhost — PWA (Vite HMR работает)
- http://localhost/api — NestJS API
- http://localhost:8000/docs — FastAPI Swagger (только в dev)

---

## Первый деплой на сервер

### 1. Подготовка сервера (один раз)

```bash
ssh ubuntu@YOUR_IP

sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git

# Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

# Файрвол
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Клонируем репо

```bash
git clone https://github.com/ВАШ_ORG/viju /opt/viju
cd /opt/viju/infra
cp .env.example .env
nano .env  # заполни все переменные
```

### 3. SSL сертификат (Let's Encrypt)

Убедись что A-запись vizhu.su смотрит на IP сервера:
```bash
ping vizhu.su  # должен вернуть IP сервера (пакеты могут не идти — это нормально для Yandex Cloud)
curl -I http://vizhu.su  # должен ответить (даже 502 — ок)
```

Выпускаем сертификат:
```bash
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh vizhu.su your@email.com
```

Запускаем автообновление (сертификат живёт 90 дней, certbot обновит сам):
```bash
docker compose --profile ssl up -d certbot
```

### 4. Запуск

```bash
docker compose up -d
docker compose ps     # все сервисы должны быть healthy
docker compose logs -f
```

Открывай https://vizhu.su 🎉

---

## CI/CD (GitHub Actions)

После первого ручного деплоя настраиваешь автодеплой.

Добавь секреты в GitHub → Settings → Secrets:

| Секрет | Значение |
|--------|---------|
| `VPS_HOST` | IP сервера |
| `VPS_USER` | `ubuntu` |
| `VPS_SSH_KEY` | приватный SSH ключ |

Генерация ключа (на локалке):
```bash
ssh-keygen -t ed25519 -C "viju-deploy" -f ~/.ssh/viju_deploy
ssh-copy-id -i ~/.ssh/viju_deploy.pub ubuntu@YOUR_IP
cat ~/.ssh/viju_deploy  # это вставляешь в VPS_SSH_KEY
```

После этого каждый push в `main`:
`тесты → сборка Docker образов → деплой на vizhu.su`
