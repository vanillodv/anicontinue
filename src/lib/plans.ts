export type PlanId = 'free' | 'fan' | 'otaku';
export type PackId = 'pack_10' | 'pack_30' | 'pack_100';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;          // RUB/месяц, 0 = бесплатно
  chaptersLimit: number;
  badge?: string;
  color: string;
  features: string[];
}

export interface Pack {
  id: PackId;
  name: string;
  price: number;     // RUB, разовый платёж
  chapters: number;
  badge?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Бесплатно',
    price: 0,
    chaptersLimit: 3,
    color: 'gray',
    features: [
      '3 генерации в месяц',
      'Все аниме каталога',
      'Публикация в сообществе',
      'Базовые настройки главы',
    ],
  },
  {
    id: 'fan',
    name: 'Фан',
    price: 299,
    chaptersLimit: 30,
    color: 'pink',
    features: [
      '30 генераций в месяц',
      'Все аниме каталога',
      'Публикация в сообществе',
      'Вписать себя в историю',
      'История всех глав',
    ],
  },
  {
    id: 'otaku',
    name: 'Отаку',
    price: 699,
    chaptersLimit: 100,
    badge: 'Лучший выбор',
    color: 'purple',
    features: [
      '100 генераций в месяц',
      'Все аниме каталога',
      'Публикация в сообществе',
      'Вписать себя в историю',
      'История всех глав',
      'Приоритетная очередь',
      'Значок Отаку в профиле',
    ],
  },
];

export const PACKS: Pack[] = [
  {
    id: 'pack_10',
    name: '10 генераций',
    price: 99,
    chapters: 10,
  },
  {
    id: 'pack_30',
    name: '30 генераций',
    price: 249,
    chapters: 30,
    badge: 'Популярный',
  },
  {
    id: 'pack_100',
    name: '100 генераций',
    price: 649,
    chapters: 100,
    badge: 'Выгоднее всего',
  },
];

export function getPlanById(id: PlanId): Plan {
  return PLANS.find(p => p.id === id) ?? PLANS[0];
}

export function getPackById(id: PackId): Pack | undefined {
  return PACKS.find(p => p.id === id);
}

/** Расчёт даты окончания подписки (+30 дней) */
export function getExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}
