import type { IconName } from '@/ui/Icon';

export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly short: string;
  readonly icon: IconName;
}

export const NAV: readonly NavItem[] = [
  { to: '/', label: 'Таймер', short: 'Таймер', icon: 'timer' },
  { to: '/stats', label: 'Аналитика', short: 'Аналитика', icon: 'chart' },
  { to: '/subjects', label: 'Предметы', short: 'Предметы', icon: 'layers' },
  { to: '/achievements', label: 'Достижения', short: 'Награды', icon: 'medal' },
  { to: '/settings', label: 'Настройки', short: 'Настройки', icon: 'sliders' },
];
