import { type ComponentType } from 'react';

import { IconBanknote, IconText, IconVolunteer, IconWhatAround } from './quickActionIcons';

export type QuickAction = {
  id: string;
  label: string;
  prompt: string;
  Icon: ComponentType;
  ariaLabel: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'what-around',
    label: 'Что вокруг',
    prompt: 'Опиши, что находится вокруг меня',
    Icon: IconWhatAround,
    ariaLabel: 'Что вокруг — описать окружение',
  },
  {
    id: 'text',
    label: 'Текст',
    prompt: 'Прочитай текст перед камерой',
    Icon: IconText,
    ariaLabel: 'Текст — прочитать текст перед камерой',
  },
  {
    id: 'banknote',
    label: 'Купюры',
    prompt: 'Определи номинал купюры перед камерой',
    Icon: IconBanknote,
    ariaLabel: 'Купюры — определить номинал',
  },
  {
    id: 'volunteer',
    label: 'Волонтёр',
    prompt: 'Соедини меня с волонтёром',
    Icon: IconVolunteer,
    ariaLabel: 'Волонтёр — связаться с живым помощником',
  },
];
