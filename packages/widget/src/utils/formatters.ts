import { formatPrice, formatDuration } from '@bookify/shared';
import { t, type Locale } from '../i18n';

export { formatPrice, formatDuration };

export function formatDateLong(dateStr: string, locale: Locale = 'nl'): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate();
  const monthKey = `month.${date.getMonth()}` as const;
  const month = t(monthKey as any, locale);
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
