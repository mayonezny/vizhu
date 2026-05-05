#!/bin/bash
# ================================================
# Первоначальный выпуск Let's Encrypt сертификата
# Запускать ОДИН РАЗ при первом деплое
#
# Использование:
#   ./scripts/init-ssl.sh vizhu.su your@email.com
# ================================================

set -e

DOMAIN=${1:?"Укажи домен: ./init-ssl.sh vizhu.su email@example.com"}
EMAIL=${2:?"Укажи email: ./init-ssl.sh vizhu.su email@example.com"}

echo "▶ Поднимаем nginx (HTTP) для certbot challenge..."
docker compose up -d nginx

echo "▶ Ждём 3 секунды пока nginx стартует..."
sleep 3

echo "▶ Запрашиваем сертификат для $DOMAIN..."
docker run --rm \
  -v "$(pwd)/../certbot_conf:/etc/letsencrypt" \
  -v "$(pwd)/../certbot_www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

echo "▶ Перезапускаем nginx с HTTPS..."
docker compose restart nginx

echo ""
echo "✅ Готово! Сертификат выпущен для $DOMAIN"
echo ""
echo "Запусти автообновление:"
echo "  docker compose --profile ssl up -d certbot"
