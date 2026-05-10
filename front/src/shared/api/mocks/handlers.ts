import { http, HttpResponse } from 'msw';

import type { HistoryEntry } from '@/entities/history';
import type { Post } from '@/entities/post';

const MOCK_POSTS: Post[] = [
  { id: 1, userId: 1, title: 'Mock Post One', body: 'Body of mock post one.' },
  { id: 2, userId: 1, title: 'Mock Post Two', body: 'Body of mock post two.' },
  { id: 3, userId: 2, title: 'Mock Post Three', body: 'Body of mock post three.' },
];

const now = new Date();
const ts = (daysAgo: number, h: number, m: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: 'mock-1',
    type: 'currency',
    title: '1000₽',
    createdAt: ts(0, 9, 42),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(0, 9, 40) },
      { role: 'user', text: 'Какая это купюра?', timestamp: ts(0, 9, 41) },
      {
        role: 'assistant',
        text: 'Это банкнота номиналом 1000 рублей серии 2004 года.',
        timestamp: ts(0, 9, 42),
      },
    ],
  },
  {
    id: 'mock-2',
    type: 'ocr',
    title: 'Квитанция ЖКХ',
    createdAt: ts(0, 9, 21),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(0, 9, 4) },
      { role: 'user', text: 'Прочитай документ', timestamp: ts(0, 9, 4) },
      {
        role: 'assistant',
        text: 'Это квитанция ЖКХ за апрель 2026. Сумма к оплате — 7 423 рубля 18 копеек, срок до 25 апреля.',
        timestamp: ts(0, 9, 5),
      },
      { role: 'user', text: 'А по статьям что?', timestamp: ts(0, 9, 5) },
      {
        role: 'assistant',
        text: 'Холодная вода — 577 ₽, горячая — 1 587 ₽, электричество — 998 ₽, содержание жилья — 2 145 ₽. Остальное — мелкие позиции.',
        timestamp: ts(0, 9, 6),
      },
    ],
  },
  {
    id: 'mock-3',
    type: 'describe',
    title: 'Кухня',
    createdAt: ts(0, 9, 8),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(0, 9, 6) },
      { role: 'user', text: 'Что ты видишь?', timestamp: ts(0, 9, 7) },
      {
        role: 'assistant',
        text: 'На фото кухня: светлый гарнитур вдоль стены, на столешнице чайник и кружки. Слева — окно с белыми жалюзи.',
        timestamp: ts(0, 9, 8),
      },
    ],
  },
  {
    id: 'mock-4',
    type: 'currency',
    title: '500₽',
    createdAt: ts(0, 8, 15),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(0, 8, 14) },
      { role: 'user', text: 'Определи купюру', timestamp: ts(0, 8, 15) },
      {
        role: 'assistant',
        text: 'Это банкнота номиналом 500 рублей. Цвет — фиолетово-синий, на аверсе изображён Соловецкий монастырь.',
        timestamp: ts(0, 8, 15),
      },
    ],
  },
  {
    id: 'mock-5',
    type: 'volunteer',
    title: 'Вокзал',
    createdAt: ts(1, 19, 15),
    messages: [
      { role: 'assistant', text: 'Привет! Как могу помочь?', timestamp: ts(1, 19, 10) },
      { role: 'user', text: 'Помогите найти кассу на вокзале', timestamp: ts(1, 19, 12) },
      {
        role: 'assistant',
        text: 'Двигайтесь прямо по главному коридору, касса будет справа через 30 метров.',
        timestamp: ts(1, 19, 15),
      },
    ],
  },
  {
    id: 'mock-6',
    type: 'describe',
    title: 'Аптека',
    createdAt: ts(1, 14, 33),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(1, 14, 31) },
      { role: 'user', text: 'Опиши что передо мной', timestamp: ts(1, 14, 32) },
      {
        role: 'assistant',
        text: 'Перед вами витрина аптеки. На полках расположены упаковки лекарств, слева — стойка с витаминами, справа — кассовая зона.',
        timestamp: ts(1, 14, 33),
      },
      { role: 'user', text: 'Есть ли очередь?', timestamp: ts(1, 14, 34) },
      {
        role: 'assistant',
        text: 'У кассы стоят два человека. Очередь небольшая.',
        timestamp: ts(1, 14, 35),
      },
    ],
  },
  {
    id: 'mock-7',
    type: 'ocr',
    title: 'Этикетка лекарства',
    createdAt: ts(1, 11, 5),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(1, 11, 4) },
      { role: 'user', text: 'Прочитай этикетку', timestamp: ts(1, 11, 4) },
      {
        role: 'assistant',
        text: 'Ибупрофен 400 мг. Таблетки покрытые оболочкой. Применять по 1 таблетке 3 раза в день после еды. Не более 3 дней без назначения врача.',
        timestamp: ts(1, 11, 5),
      },
      { role: 'user', text: 'Какой срок годности?', timestamp: ts(1, 11, 6) },
      {
        role: 'assistant',
        text: 'Срок годности: до 08/2027. Хранить при температуре не выше 25°C.',
        timestamp: ts(1, 11, 6),
      },
    ],
  },
  {
    id: 'mock-long',
    type: 'describe',
    title: 'Парк',
    createdAt: ts(2, 16, 20),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(2, 16, 0) },
      { role: 'user', text: 'Расскажи что вокруг меня', timestamp: ts(2, 16, 1) },
      {
        role: 'assistant',
        text: 'Вы находитесь в парке. Прямо перед вами — широкая асфальтированная дорожка, по обеим сторонам посажены липы. Слева на скамейке сидит пожилая пара, справа — детская площадка с горкой и качелями.',
        timestamp: ts(2, 16, 2),
      },
      { role: 'user', text: 'Есть ли поблизости урна или скамейка?', timestamp: ts(2, 16, 3) },
      {
        role: 'assistant',
        text: 'Да. Урна стоит примерно в 3 метрах справа от вас у края дорожки. Ближайшая свободная скамейка — прямо по курсу, около 10 метров.',
        timestamp: ts(2, 16, 4),
      },
      { role: 'user', text: 'Есть люди рядом?', timestamp: ts(2, 16, 5) },
      {
        role: 'assistant',
        text: 'Рядом немноголюдно. Позади вас метрах в пяти проходит мужчина с собакой. Навстречу идёт женщина с коляской, расстояние около 8 метров.',
        timestamp: ts(2, 16, 6),
      },
      {
        role: 'user',
        text: 'Как выглядит дорожка впереди, есть ли ступени или препятствия?',
        timestamp: ts(2, 16, 7),
      },
      {
        role: 'assistant',
        text: 'Дорожка ровная, без ступеней. Примерно через 15 метров — пологий пандус вниз, после него дорожка поворачивает направо к фонтану. Препятствий на пути не вижу.',
        timestamp: ts(2, 16, 8),
      },
      { role: 'user', text: 'Вижу ли я где-нибудь кафе или киоск?', timestamp: ts(2, 16, 10) },
      {
        role: 'assistant',
        text: 'Да, справа по дорожке, примерно в 40 метрах, виден небольшой киоск с синей вывеской. Похоже на кофейную точку — снаружи стоит штендер и пластиковые стулья.',
        timestamp: ts(2, 16, 11),
      },
      { role: 'user', text: 'Можешь подробнее описать фонтан?', timestamp: ts(2, 16, 13) },
      {
        role: 'assistant',
        text: 'Фонтан круглый, диаметр примерно 6 метров, обрамлён гранитным бортиком высотой около 40 сантиметров. В центре — небольшая каменная скульптура. Вода работает, вокруг мокрый бортик. Рядом несколько скамеек.',
        timestamp: ts(2, 16, 14),
      },
      { role: 'user', text: 'Спасибо, этого достаточно', timestamp: ts(2, 16, 15) },
      {
        role: 'assistant',
        text: 'Пожалуйста! Если понадоблюсь — обращайтесь. Хорошей прогулки!',
        timestamp: ts(2, 16, 15),
      },
    ],
  },
  {
    id: 'mock-8',
    type: 'ocr',
    title: 'Меню кафе',
    createdAt: ts(3, 12, 45),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(3, 12, 44) },
      { role: 'user', text: 'Прочитай меню', timestamp: ts(3, 12, 44) },
      {
        role: 'assistant',
        text: 'Меню кафе «Уют». Завтраки: каша овсяная — 180 ₽, яичница с тостом — 220 ₽, сырники со сметаной — 260 ₽. Напитки: кофе американо — 150 ₽, латте — 200 ₽, чай — 100 ₽.',
        timestamp: ts(3, 12, 45),
      },
    ],
  },
  {
    id: 'mock-9',
    type: 'currency',
    title: '5000₽',
    createdAt: ts(3, 10, 5),
    messages: [
      { role: 'assistant', text: 'Слушаю вас!', timestamp: ts(3, 10, 4) },
      { role: 'user', text: 'Что за купюра?', timestamp: ts(3, 10, 4) },
      {
        role: 'assistant',
        text: 'Это банкнота номиналом 5000 рублей. Красно-оранжевый цвет, на аверсе — памятник Муравьёву-Амурскому в Хабаровске.',
        timestamp: ts(3, 10, 5),
      },
    ],
  },
];

export const handlers = [
  // ─── Auth ──────────────────────────────────────────────────────────────────
  // Запрос кода: любой номер → успех через ~600 мс
  http.post('*/auth/request-code', async () => {
    await new Promise((r) => setTimeout(r, 600));
    return HttpResponse.json({ ok: true, expires_in: 300 });
  }),

  // Верификация кода:
  //   0000 → неверный код (400)
  //   9999 → код устарел (410)
  //   любой другой 4-значный → успех
  http.post('*/auth/verify-code', async ({ request }) => {
    await new Promise((r) => setTimeout(r, 800));

    const { phone, code } = (await request.json()) as { phone: string; code: string };

    if (code === '0000') {
      return HttpResponse.json(
        { error: 'invalid_code', message: 'Неверный код. Проверьте и попробуйте снова.' },
        { status: 400 },
      );
    }

    if (code === '9999') {
      return HttpResponse.json(
        { error: 'code_expired', message: 'Код устарел. Запросите новый.' },
        { status: 410 },
      );
    }

    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        name: 'Светлана',
        phone,
        is_new: true,
      },
    });
  }),

  // ─── AI ────────────────────────────────────────────────────────────────────
  http.post('*/ai/stt', async () => {
    await new Promise((r) => setTimeout(r, 800));
    return HttpResponse.json({ text: 'тестовый распознанный текст' });
  }),

  http.post('*/ai/classify', async () => {
    await new Promise((r) => setTimeout(r, 300));
    return HttpResponse.json({ command: 1, raw: 'тестовый распознанный текст' });
  }),

  http.post('*/ai/describe', async () => {
    await new Promise((r) => setTimeout(r, 1200));
    return HttpResponse.json({
      text: 'На фото видна комната с деревянными полками. На полках стоят книги и различные предметы декора.',
      model: 'GigaChat',
    });
  }),

  http.post('*/ai/ocr', async () => {
    await new Promise((r) => setTimeout(r, 900));
    return HttpResponse.json({
      text: 'Образец текста, распознанный системой OCR. Строка вторая.',
      model: 'YandexVision',
    });
  }),

  http.post('*/ai/currency', async () => {
    await new Promise((r) => setTimeout(r, 700));
    return HttpResponse.json({ amount: '1000 рублей', confidence: 0.97 });
  }),

  http.post('*/ai/chat', async () => {
    await new Promise((r) => setTimeout(r, 600));
    return HttpResponse.json({
      text: 'Это тестовый ответ нейропомощника на ваш вопрос.',
      model: 'GigaChat',
    });
  }),

  http.get('*/history', () => HttpResponse.json(MOCK_HISTORY)),

  http.get('*/history/:id', ({ params }) => {
    const entry = MOCK_HISTORY.find((e) => e.id === params.id);
    if (!entry) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(entry);
  }),

  http.delete('*/history/:id', () => new HttpResponse(null, { status: 204 })),

  http.get('*/posts', () => HttpResponse.json(MOCK_POSTS)),

  http.get('*/posts/:id', ({ params }) => {
    const post = MOCK_POSTS.find((p) => p.id === Number(params.id));
    if (!post) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(post);
  }),

  http.post('*/posts', async ({ request }) => {
    const body = (await request.json()) as Omit<Post, 'id'>;
    const newPost: Post = { id: Date.now(), ...body };
    return HttpResponse.json(newPost, { status: 201 });
  }),

  http.delete('*/posts/:id', () => new HttpResponse(null, { status: 204 })),
];
