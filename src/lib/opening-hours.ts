import type { OpeningHours, DayHours } from './types';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
}

function isDayOpen(d: DayHours | undefined): boolean {
  if (!d) return false;
  if (d.is_24_hours) return true;
  const open = parseTimeToMinutes(d.open_time);
  const close = parseTimeToMinutes(d.close_time);
  // 00:00–00:00 is the placeholder for "closed/no data"
  if (open == null || close == null) return false;
  if (open === 0 && close === 0) return false;
  return open !== close;
}

export interface OpenStatus {
  isOpen: boolean;
  label: string;          // "Open · Closes 22:00" / "Closed · Opens Mon 06:00"
  todayHours: string;     // "06:00 - 22:00" / "24 hours" / "Closed"
}

export function getOpenStatus(hours: OpeningHours | undefined, now: Date = new Date()): OpenStatus | null {
  if (!hours) return null;

  const dayIdx = now.getDay();
  const todayKey = DAY_KEYS[dayIdx];
  const today = hours[todayKey];

  // 24 hour station
  if (today?.is_24_hours) {
    return { isOpen: true, label: 'Open 24 hours', todayHours: '24 hours' };
  }

  if (!isDayOpen(today)) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const next = hours[DAY_KEYS[(dayIdx + i) % 7]];
      if (isDayOpen(next)) {
        const label = next?.is_24_hours
          ? `Closed · Opens ${DAY_LABELS[(dayIdx + i) % 7]} 24h`
          : `Closed · Opens ${DAY_LABELS[(dayIdx + i) % 7]} ${(next?.open_time || '').slice(0, 5)}`;
        return { isOpen: false, label, todayHours: 'Closed' };
      }
    }
    return { isOpen: false, label: 'Closed', todayHours: 'Closed' };
  }

  // Check if currently within today's hours
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = parseTimeToMinutes(today?.open_time);
  const closeMins = parseTimeToMinutes(today?.close_time);

  if (openMins != null && closeMins != null) {
    // Handle overnight (e.g. 22:00 - 02:00)
    const isOvernight = closeMins < openMins;
    const isOpen = isOvernight
      ? (nowMins >= openMins || nowMins < closeMins)
      : (nowMins >= openMins && nowMins < closeMins);

    const todayHours = `${(today?.open_time || '').slice(0, 5)} - ${(today?.close_time || '').slice(0, 5)}`;

    if (isOpen) {
      return {
        isOpen: true,
        label: `Open · Closes ${(today?.close_time || '').slice(0, 5)}`,
        todayHours,
      };
    }
    if (nowMins < openMins) {
      return {
        isOpen: false,
        label: `Closed · Opens ${(today?.open_time || '').slice(0, 5)}`,
        todayHours,
      };
    }
    // After close — find next day
    for (let i = 1; i <= 7; i++) {
      const next = hours[DAY_KEYS[(dayIdx + i) % 7]];
      if (isDayOpen(next)) {
        const label = next?.is_24_hours
          ? `Closed · Opens ${DAY_LABELS[(dayIdx + i) % 7]} 24h`
          : `Closed · Opens ${DAY_LABELS[(dayIdx + i) % 7]} ${(next?.open_time || '').slice(0, 5)}`;
        return { isOpen: false, label, todayHours };
      }
    }
  }

  return null;
}

export function getWeekSchedule(hours: OpeningHours | undefined): { day: string; text: string; isToday: boolean }[] {
  if (!hours) return [];
  const todayIdx = new Date().getDay();
  return DAY_KEYS.map((key, i) => {
    const d = hours[key];
    let text = 'Closed';
    if (d?.is_24_hours) text = '24 hours';
    else if (isDayOpen(d)) text = `${(d?.open_time || '').slice(0, 5)} - ${(d?.close_time || '').slice(0, 5)}`;
    return { day: DAY_LABELS[i], text, isToday: i === todayIdx };
  });
}
