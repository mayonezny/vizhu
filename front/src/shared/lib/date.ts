export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const getDateGroup = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Сегодня';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

export const groupByDate = <T>(
  items: T[],
  getDate: (item: T) => string,
): { label: string; items: T[] }[] => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const label = getDateGroup(getDate(item));
    const group = map.get(label);
    if (group) {
      group.push(item);
    } else {
      map.set(label, [item]);
    }
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
};
