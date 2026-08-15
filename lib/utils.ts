import type { AppointmentStatus } from '@/types';

/**
 * Shared helpers.
 *
 * Date handling deliberately works on `YYYY-MM-DD` strings rather than `Date`
 * objects, matching the backend. Constructing `new Date('2026-08-17')` parses
 * as UTC midnight and then renders in local time, which shows the previous day
 * for anyone west of Greenwich — a bug that is easy to introduce and hard to
 * spot. Every formatter below pins the date to UTC noon before formatting.
 */

/** Conditional className joiner. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Parses `YYYY-MM-DD` to a Date fixed at UTC noon — safe for formatting.
 *
 * Returns `null` for anything that is not a real calendar date. Values reaching
 * these formatters can come from stored JSON payloads, and `Intl.DateTimeFormat`
 * throws `RangeError` on an invalid Date — which took down the whole chat
 * transcript when one bad row was rendered.
 */
function parseDate(date: string): Date | null {
  if (typeof date !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
  const parsed = parseDate(date);
  if (!parsed) return date;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**`"2026-08-17"` →`"Monday, 17 August 2026"` */
export function formatDateLong(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/**`"2026-08-17"` →`"Mon, 17 Aug"` */
export function formatDateShort(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatWeekday(date: string, style: 'short' | 'long' = 'short'): string {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: style,
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatDayOfMonth(date: string): string {
  return String(parseDate(date)?.getUTCDate() ?? '–');
}

export function formatMonthYear(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/**`"14:30"` →`"2:30 PM"` */
export function formatTime12h(time: string): string {
  const [hoursRaw, minutes = '00'] = time.slice(0, 5).split(':');
  const hours = Number(hoursRaw);
  const period = hours >= 12 ? 'PM' : 'AM';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${minutes} ${period}`;
}

/**"Today" /"Tomorrow" /"Yesterday", else the short date. */
export function formatRelativeDay(date: string): string {
  const diff = daysBetween(todayISO(), date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return formatDateShort(date);
}

/** Clock time for a chat bubble. */
export function formatMessageTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoTimestamp));
}

export function isPastDate(date: string): boolean {
  return daysBetween(todayISO(), date) < 0;
}

export function isToday(date: string): boolean {
  return date === todayISO();
}

/** Sunday is the clinic's closed day. */
export function isSunday(date: string): boolean {
  return parseDate(date)?.getUTCDay() === 0;
}

// ---------------------------------------------------------------------------
// Status presentation
// ---------------------------------------------------------------------------

/**
 * Status colours are defined once here so a badge, a table row and a filter
 * pill can never disagree about what "cancelled" looks like.
 */
export const STATUS_STYLES: Record<
  AppointmentStatus,
  { label: string; badge: string; dot: string }
> = {
  BOOKED: {
    label: 'Booked',
    badge: 'bg-info-bg text-info-fg border-info-border',
    dot: 'bg-info-fg',
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'bg-success-bg text-success-fg border-success-border',
    dot: 'bg-success-fg',
  },
  CANCELLED: {
    label: 'Cancelled',
    badge: 'bg-danger-bg text-danger-fg border-danger-border',
    dot: 'bg-danger-fg',
  },
};

export function formatPrice(price: number | null): string {
  if (price === null) return 'On request';
  return `from $${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Two-letter initials for an avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

/**
 * Client-side validators.
 *
 * These mirror the server's rules to give immediate feedback while typing —
 * they are a convenience, never the enforcement. The API validates everything
 * again, and the database constrains it after that.
 */
export const validators = {
  email(value: string): string | null {
    if (!value.trim()) return 'Email address is required.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim()))
      return 'Please enter a valid email address.';
    return null;
  },
  name(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return 'Name is required.';
    if (trimmed.length < 2) return 'Name must be at least 2 characters.';
    if (trimmed.length > 120) return 'Name must be 120 characters or fewer.';
    return null;
  },
  phone(value: string, required = true): string | null {
    const trimmed = value.trim();
    if (!trimmed) return required ? 'Phone number is required.' : null;
    if (!/^\+?[0-9 ()\-]{7,25}$/.test(trimmed)) return 'Please enter a valid phone number.';
    return null;
  },
  password(value: string): string | null {
    if (!value) return 'Password is required.';
    if (value.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.';
    if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.';
    if (!/[0-9]/.test(value)) return 'Password must include a number.';
    return null;
  },
  reason(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return 'Please tell us the reason for your visit.';
    if (trimmed.length < 3) return 'Please give a little more detail.';
    if (trimmed.length > 500) return 'Reason must be 500 characters or fewer.';
    return null;
  },
};

/** Password strength for the signup meter. */
export function passwordStrength(value: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!value) return { score: 0, label: '' };
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;

  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: labels[clamped] ?? '' };
}
