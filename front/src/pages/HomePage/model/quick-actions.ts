import { type ComponentType } from 'react';

import { IconBanknote, IconText, IconVolunteer, IconWhatAround } from './quick-action-icons';

export type QuickAction = {
  id: string;
  label: string;
  to: string;
  prompt?: string;
  Icon: ComponentType;
  ariaLabel: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'what-around',
    label: 'Что вокруг',
    to: '/dialog?mode=describe',
    prompt: 'Опиши, что находится вокруг меня',
    Icon: IconWhatAround,
    ariaLabel: 'Что вокруг — описать окружение',
  },
  {
    id: 'text',
    label: 'Текст',
    to: '/dialog?mode=ocr',
    prompt: 'Прочитай текст перед камерой',
    Icon: IconText,
    ariaLabel: 'Текст — прочитать текст перед камерой',
  },
  {
    id: 'banknote',
    label: 'Купюры',
    to: '/dialog?mode=currency',
    prompt: 'Определи номинал купюры перед камерой',
    Icon: IconBanknote,
    ariaLabel: 'Купюры — определить номинал',
  },
  {
    id: 'volunteer',
    label: 'Волонтёр',
    to: '/volunteer',
    Icon: IconVolunteer,
    ariaLabel: 'Волонтёр — связаться с живым помощником',
  },
];
