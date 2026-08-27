/**
 * Эмулятор матчинга: два socket.io-клиента изображают волонтёра и незрячего
 * и прогоняют сценарии контракта (api/doc/calls-frontend-contract.md).
 *
 * Нужен, чтобы проверять сигналинг без фронта, LiveKit и SMS — поднимаются
 * только postgres, redis и сам api.
 *
 *   docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d postgres redis
 *   npm run start:dev                       # в другом терминале
 *   node test/matching-sim.mjs              # все сценарии
 *   node test/matching-sim.mjs happy resume # только выбранные
 *
 * Переменные окружения (значения по умолчанию — под локальный dev):
 *   API_URL=http://localhost:3000
 *   JWT_SECRET=dev_secret_not_for_prod
 *   DATABASE_URL=postgresql://vizhu:devpassword@localhost:5432/vizhu
 */
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { io } from 'socket.io-client';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret_not_for_prod';
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://vizhu:devpassword@localhost:5432/vizhu';
// При запуске всех сценариев один за другим даём серверу закончить grace cleanup:
// иначе закрытые в предыдущем сценарии сокеты ещё 12 секунд остаются в состоянии
// матчинга и влияют на следующий. Для одиночного сценария пауза не нужна.
const SCENARIO_CLEANUP_MS = Number(process.env.SCENARIO_CLEANUP_MS ?? 13_000);

/** Тестовые учётки. Телефоны заведомо нереальные, чтобы не пересечься с живыми. */
const ACTORS = {
  blind: { phone: '70000000001', role: 'blind', name: 'Тест Незрячий' },
  volunteer: { phone: '70000000002', role: 'volunteer', name: 'Тест Волонтёр' },
  volunteer2: { phone: '70000000003', role: 'volunteer', name: 'Тест Волонтёр 2' },
  blind2: { phone: '70000000004', role: 'blind', name: 'Тест Незрячий 2' },
};

const log = (...args) => console.log(...args);
const ok = (msg) => log(`  \x1b[32m✓\x1b[0m ${msg}`);
const fail = (msg) => log(`  \x1b[31m✗ ${msg}\x1b[0m`);

let failures = 0;
const check = (condition, msg) => {
  if (condition) {
    ok(msg);
  } else {
    failures += 1;
    fail(msg);
  }
};

// ─── Подготовка учёток ────────────────────────────────────────────────────────

/** Создаёт (или находит) тестовых пользователей и отдаёт их идентификаторы. */
async function seedActors() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  const result = {};
  try {
    for (const [key, actor] of Object.entries(ACTORS)) {
      const account = await client.query(
        `INSERT INTO phone_accounts (uuid, phone)
         VALUES (gen_random_uuid(), $1)
         ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
         RETURNING uuid`,
        [actor.phone],
      );
      const phoneAccountId = account.rows[0].uuid;
      const user = await client.query(
        `INSERT INTO users (uuid, phone_account_id, role, name)
         VALUES (gen_random_uuid(), $1, $2, $3)
         ON CONFLICT (phone_account_id) DO UPDATE SET role = EXCLUDED.role
         RETURNING uuid`,
        [phoneAccountId, actor.role, actor.name],
      );
      // sub в токене = phone_account_id: именно по нему gateway ищет профиль,
      // а идентификатор участника матчинга — user.uuid.
      result[key] = {
        phoneAccountId,
        userId: user.rows[0].uuid,
        token: jwt.sign({ sub: phoneAccountId, phone: actor.phone }, JWT_SECRET, {
          expiresIn: '15m',
        }),
      };
    }
  } finally {
    await client.end();
  }
  return result;
}

// ─── Клиент ───────────────────────────────────────────────────────────────────

/** Обёртка над сокетом: копит события и умеет их дожидаться. */
function connectActor(name, token) {
  const socket = io(API_URL, {
    transports: ['websocket'],
    autoConnect: false,
    forceNew: true,
    auth: (cb) => cb({ token }),
  });

  const seen = [];
  const waiters = [];
  socket.onAny((event, payload) => {
    seen.push({ event, payload });
    for (const w of [...waiters]) {
      if (w.event === event) {
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(payload);
      }
    }
  });

  return {
    name,
    socket,
    seen,
    connect: () =>
      new Promise((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
        socket.connect();
      }),
    emit: (event, payload) => socket.emit(event, payload),
    /** Ждёт событие; null, если не пришло за timeout — это тоже валидный ответ. */
    wait: (event, timeout = 4000) =>
      new Promise((resolve) => {
        const hit = seen.find((e) => e.event === event);
        if (hit) {
          resolve(hit.payload);
          return;
        }
        const waiter = { event, resolve };
        waiters.push(waiter);
        setTimeout(() => {
          const i = waiters.indexOf(waiter);
          if (i !== -1) {
            waiters.splice(i, 1);
            resolve(null);
          }
        }, timeout);
      }),
    got: (event) => seen.some((e) => e.event === event),
    clear: () => {
      seen.length = 0;
    },
    close: () => socket.disconnect(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Сценарии ─────────────────────────────────────────────────────────────────

const scenarios = {
  /** Базовый путь: волонтёр на линии, незрячий зовёт, оба попадают в комнату. */
  async happy(actors) {
    const volunteer = connectActor('volunteer', actors.volunteer.token);
    const blind = connectActor('blind', actors.blind.token);
    try {
      await volunteer.connect();
      volunteer.emit('volunteer:online');
      await sleep(200);

      await blind.connect();
      blind.emit('call:request');

      const incoming = await volunteer.wait('call:incoming');
      check(Boolean(incoming?.requestId), 'волонтёр получил call:incoming');
      await blind.wait('call:searching');
      check(blind.got('call:searching'), 'незрячий получил call:searching');

      volunteer.emit('call:accept', { requestId: incoming.requestId });
      const volunteerMatch = await volunteer.wait('call:matched');
      const blindMatch = await blind.wait('call:matched');

      check(Boolean(volunteerMatch?.token), 'волонтёр получил токен LiveKit');
      check(Boolean(blindMatch?.token), 'незрячий получил токен LiveKit');
      check(
        volunteerMatch?.room && volunteerMatch.room === blindMatch?.room,
        `обе стороны в одной комнате (${volunteerMatch?.room ?? '—'})`,
      );
      check(
        volunteerMatch?.token !== blindMatch?.token,
        'токены разные (у каждого свой identity)',
      );
    } finally {
      volunteer.close();
      blind.close();
    }
  },

  /** Отказ волонтёра: запрос уходит следующему свободному. */
  async decline(actors) {
    const v1 = connectActor('volunteer', actors.volunteer.token);
    const v2 = connectActor('volunteer2', actors.volunteer2.token);
    const blind = connectActor('blind', actors.blind.token);
    try {
      await v1.connect();
      v1.emit('volunteer:online');
      await sleep(300);

      await blind.connect();
      blind.emit('call:request');
      const incoming = await v1.wait('call:incoming');
      check(Boolean(incoming), 'первый волонтёр получил вызов');

      // второй встаёт на линию только теперь — чтобы очередь ушла именно ему
      await v2.connect();
      v2.emit('volunteer:online');
      await sleep(200);

      v1.emit('call:decline', { requestId: incoming.requestId });
      check(Boolean(await v2.wait('call:incoming')), 'после отказа вызов ушёл второму волонтёру');
    } finally {
      v1.close();
      v2.close();
      blind.close();
    }
  },

  /** Явный уход с линии: звонки такому волонтёру приходить не должны. */
  async offline(actors) {
    const volunteer = connectActor('volunteer', actors.volunteer.token);
    const blind = connectActor('blind', actors.blind.token);
    try {
      await volunteer.connect();
      volunteer.emit('volunteer:online');
      await sleep(200);
      volunteer.emit('volunteer:offline');
      await sleep(300);

      await blind.connect();
      blind.emit('call:request');

      await blind.wait('call:waiting');
      check(blind.got('call:waiting'), 'незрячий встал в очередь');
      check(!volunteer.got('call:incoming'), 'ушедшему волонтёру вызов не пришёл');
    } finally {
      volunteer.close();
      blind.close();
    }
  },

  /** Реконнект посреди звонка: call:resume возвращает тот же матч. */
  async resume(actors) {
    const volunteer = connectActor('volunteer', actors.volunteer.token);
    const blind = connectActor('blind', actors.blind.token);
    let revived;
    try {
      await volunteer.connect();
      volunteer.emit('volunteer:online');
      await sleep(200);
      await blind.connect();
      blind.emit('call:request');

      const incoming = await volunteer.wait('call:incoming');
      volunteer.emit('call:accept', { requestId: incoming.requestId });
      const original = await blind.wait('call:matched');
      check(Boolean(original?.room), 'звонок состоялся');

      // рвём сокет незрячего и поднимаем заново — как при потере сети
      blind.close();
      await sleep(500);
      revived = connectActor('blind-revived', actors.blind.token);
      await revived.connect();
      revived.emit('call:resume');

      const restored = await revived.wait('call:matched');
      check(restored?.room === original?.room, 'после reconnect матч передоставлен той же комнатой');
    } finally {
      volunteer.close();
      revived?.close();
    }
  },

  /** Два незрячих на одного волонтёра: второй ждёт, а не сводится в ту же комнату. */
  async queue(actors) {
    const volunteer = connectActor('volunteer', actors.volunteer.token);
    const blind = connectActor('blind', actors.blind.token);
    const blind2 = connectActor('blind2', actors.blind2.token);
    try {
      await volunteer.connect();
      volunteer.emit('volunteer:online');
      await sleep(200);

      await blind.connect();
      blind.emit('call:request');
      const incoming = await volunteer.wait('call:incoming');
      volunteer.emit('call:accept', { requestId: incoming.requestId });
      await blind.wait('call:matched');

      await blind2.connect();
      blind2.emit('call:request');
      await blind2.wait('call:waiting');
      check(blind2.got('call:waiting'), 'второй незрячий встал в очередь');
      check(!blind2.got('call:matched'), 'второго не свело с занятым волонтёром');
    } finally {
      volunteer.close();
      blind.close();
      blind2.close();
    }
  },
};

// ─── Запуск ───────────────────────────────────────────────────────────────────

const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(scenarios);

log(`\nМатчинг: ${API_URL}\n`);
const actors = await seedActors();

for (const [index, name] of names.entries()) {
  const scenario = scenarios[name];
  if (!scenario) {
    log(`\x1b[33mнеизвестный сценарий: ${name}\x1b[0m`);
    continue;
  }
  log(`\x1b[1m${name}\x1b[0m`);
  try {
    await scenario(actors);
  } catch (error) {
    failures += 1;
    fail(`упал с ошибкой: ${error.message}`);
  }
  if (index + 1 < names.length) await sleep(SCENARIO_CLEANUP_MS);
}

log(failures ? `\n\x1b[31mПровалено проверок: ${failures}\x1b[0m\n` : '\n\x1b[32mВсё зелёное\x1b[0m\n');
process.exit(failures ? 1 : 0);
