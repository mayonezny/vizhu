# Отчёт: перенос матчинга звонков на Redis

## Результат

Матчинг звонков отделён от памяти процесса NestJS и может работать через Redis.
Выбор реализации выполняется параметром окружения:

```env
MATCHING_BACKEND=memory # значение по умолчанию
# либо
MATCHING_BACKEND=redis
```

Публичный Socket.IO-контракт не изменялся: набор клиентских и серверных событий
сохранён в [`calls-frontend-contract.md`](calls-frontend-contract.md). Код в
`front/` не менялся.

## Реализованная логика

### 1. Слой хранения состояния

`MatchingService` больше не хранит очередь, присутствие и таймеры в собственных
`Map`/`Set`. Он использует интерфейс `MatchingStore`, поэтому бизнес-алгоритм
одинаков для двух реализаций:

- `InMemoryMatchingStore` — совместимый режим для безопасного отката;
- `RedisMatchingStore` — persistent-состояние для production-режима.

Флаг `MATCHING_BACKEND` выбирает реализацию при создании провайдеров NestJS.
Некорректное значение завершает запуск API с явной ошибкой.

### 2. Состояние в Redis

Все ключи начинаются с `matching:v1:`. Версия в префиксе позволяет изменить
формат ключей в будущем без смешивания данных разных версий.

| Ключ | Тип | Назначение |
| --- | --- | --- |
| `online` | hash | `userId → socketId` текущего процесса |
| `available` | set | свободные волонтёры |
| `pending` | list | FIFO-очередь идентификаторов запросов |
| `pending:by-blind`, `pending:item:{id}` | hash + string | дедупликация и данные заявки |
| `ring:{id}` | string JSON | активный дозвон |
| `ring:by-blind`, `ring:by-volunteer` | hash | поиск активного дозвона по участнику |
| `ring:deadlines` | sorted set | deadline дозвона (20 секунд) |
| `grace:{userId}`, `grace:deadlines` | TTL key + sorted set | окно реконнекта (12 секунд) |
| `match:{userId}` | string JSON + TTL | LiveKit-данные для `call:resume` (60 секунд) |

Секретный LiveKit JWT попадает только в `match:{userId}`, хранится 60 секунд и
не пишется в логи.

### 3. Таймеры и восстановление

В `MatchingService` добавлен sweep с периодом одна секунда. Он обрабатывает:

- deadline непринятого звонка: удаляет дозвон и запускает подбор следующего
  волонтёра;
- deadline grace: запускает существующую очистку (`purge`) пользователя,
  отменяет звонок либо возвращает заявку в подбор;
- TTL матча: Redis удаляет его самостоятельно — side effect не требуется.

Это критично для рестарта API: сами socket ID после рестарта устаревают, но
очередь, дозвоны и сроки сохраняются в Redis. После штатного reconnect клиент
повторяет уже предусмотренные контрактом события (`volunteer:online`,
`call:request`, `call:resume`), а сервер заменяет socket ID пользователя.

### 4. Надёжность Socket.IO

Аутентификация перенесена в Socket.IO middleware. Теперь клиент получает
`connect` только после проверки JWT и загрузки профиля. Это устраняет гонку,
при которой первое `volunteer:online` или `call:request` могло прийти раньше,
чем роль и идентификатор пользователя были записаны в `socket.data`.

### 5. Инфраструктура и health

Redis больше не находится в опциональном Compose profile: сервис запускается
всегда, а API зависит от его healthcheck. Политика вытеснения заменена с
`allkeys-lru` на `noeviction`, чтобы Redis не удалял живую очередь или дозвон
при дефиците памяти.

`GET /health` проверяет доступность выбранного matching store. В Redis-режиме
сбой Redis приводит к `503`, а не к незаметному fallback в память.

## Карта изменённых файлов

| Файл | Назначение |
| --- | --- |
| `api/src/modules/calls/matching.store.ts` | интерфейс хранилища, общие типы и injection token |
| `api/src/modules/calls/in-memory-matching.store.ts` | memory-реализация, эталон прежнего поведения |
| `api/src/modules/calls/redis-matching.store.ts` | ioredis-реализация, ключи, TTL, FIFO и deadline indexes |
| `api/src/modules/calls/matching.service.ts` | бизнес-логика матчинга, sweep и purge через `MatchingStore` |
| `api/src/modules/calls/calls.module.ts` | выбор backend по `MATCHING_BACKEND` |
| `api/src/modules/calls/calls.gateway.ts` | Socket.IO auth middleware и вызовы async-матчинга |
| `api/src/common/health.controller.ts` | readiness-проверка matching store |
| `infra/docker-compose.yml` | обязательный Redis, health dependency, `noeviction` |
| `infra/docker-compose.dev.yml` | передача `MATCHING_BACKEND` в API |
| `api/test/matching-sim.mjs` | исправление проверки событий без payload и изоляция grace между сценариями |
| `api/test/app.e2e-spec.ts` | реальный Fastify e2e тест `/health` вместо шаблонного Express/Hello World |
| `api/src/modules/calls/*.spec.ts` | unit и Redis-интеграционные тесты хранилища и сервиса |
| `api/doc/redis-matching-implementation-plan.md` | подробный план внедрения и критерии приёмки |
| `api/doc/redis-matching-task.md` | ссылка на подробный план |

## Проверки

Проверки выполнялись с настоящими Docker-контейнерами PostgreSQL, Redis и
LiveKit в изолированной сети.

| Команда | Результат |
| --- | --- |
| `npm run test` | успешно: memory unit-тесты; Redis suite пропускается без `REDIS_TEST_URL` |
| `REDIS_TEST_URL=redis://redis:6379 npm run test` в Docker-сети | успешно: 3 suites, 7 tests |
| `npm run test:e2e` в Docker-сети | успешно: `/health` отвечает `200` |
| `npm run build` | успешно |
| `npm run lint` | успешно |
| `npm run sim:matching` с `MATCHING_BACKEND=memory` | успешно: happy, decline, offline, resume, queue |
| `npm run sim:matching` с `MATCHING_BACKEND=redis` | успешно: happy, decline, offline, resume, queue |

## Следующие действия перед production

1. Добавить `MATCHING_BACKEND=memory` в production `.env` для первой выкладки.
2. После smoke-проверки переключить только этот параметр на `redis` и
   перезапустить API.
3. Проверить сценарий: волонтёр онлайн, незрячий в очереди, рестарт API,
   reconnect обоих клиентов, успешный подбор.
4. Наблюдать Redis memory usage, ошибки sweep и количество ключей
   `matching:v1:*`; при проблеме вернуть `MATCHING_BACKEND=memory`.
