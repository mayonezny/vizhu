import { SlidePremium } from './SlidePremium';
import { SlideVision } from './SlideVision';
import { SlideVolunteer } from './SlideVolunteer';

export const slides = [
  {
    id: 'vision',
    tag: '01 · AI-зрение',
    title: 'Опишет всё, что вокруг — голосом',
    body: 'Наведите камеру и спросите: «что передо мной?», «что написано на упаковке?»',
    cta: 'Дальше',
    Illustration: SlideVision,
  },
  {
    id: 'volunteer',
    tag: '02 · Волонтёр в кармане',
    title: 'Живой человек — круглые сутки',
    body: 'Когда AI не справляется, нажмите «Волонтёр» и поговорите с реальным человеком. Наши волонтёры готовы помочь 24/7',
    cta: 'Дальше',
    Illustration: SlideVolunteer,
  },
  {
    id: 'premium',
    tag: '03 · Бесплатно по ИПРА',
    title: 'Premium включён, если есть инвалидность',
    body: 'Подтвердите статус через Госуслуги — и расширенные функции активируются автоматически',
    cta: 'Начать',
    Illustration: SlidePremium,
  },
] as const;
