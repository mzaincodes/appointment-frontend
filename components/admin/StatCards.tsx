'use client';

import { CalendarCheck, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Feedback';
import type { AppointmentStats } from '@/types';

/**
 * Dashboard counters.
 *
 * Each card is a filter shortcut as well as a number — clicking "Cancelled"
 * filters the table to cancelled appointments, which is what someone reading
 * the number wants next.
 */

type StatKey = 'today' | 'upcoming' | 'completed' | 'cancelled';

const CARDS: Array<{
  key: StatKey;
  label: string;
  icon: typeof CalendarCheck;
  accent: string;
  iconClass: string;
  hint: (stats: AppointmentStats) => string;
}> = [
  {
    key: 'today',
    label: "Today's appointments",
    icon: CalendarCheck,
    accent: 'from-brand-500/12 to-transparent',
    iconClass: 'bg-brand-500/12 text-brand-text',
    hint: (stats) => `${stats.todayRemaining} still to come`,
  },
  {
    key: 'upcoming',
    label: 'Upcoming',
    icon: CalendarClock,
    accent: 'from-info-fg/10 to-transparent',
    iconClass: 'bg-info-bg text-info-fg',
    hint: () => 'Booked and not yet seen',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    accent: 'from-success-fg/10 to-transparent',
    iconClass: 'bg-success-bg text-success-fg',
    hint: (stats) =>
      stats.total > 0
        ? `${Math.round((stats.completed / stats.total) * 100)}% of all bookings`
        : '—',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    icon: XCircle,
    accent: 'from-danger-fg/10 to-transparent',
    iconClass: 'bg-danger-bg text-danger-fg',
    hint: (stats) =>
      stats.total > 0
        ? `${Math.round((stats.cancelled / stats.total) * 100)}% of all bookings`
        : '—',
  },
];

export function StatCards({
  stats,
  loading,
  activeFilter,
  onFilter,
}: {
  stats: AppointmentStats | null;
  loading: boolean;
  activeFilter: string | null;
  onFilter: (key: StatKey) => void;
}) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-2xl border border-line bg-surface p-5">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onFilter(card.key)}
            aria-pressed={isActive}
            className={cn(
              'group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300',
              isActive
                ? 'border-brand-500 bg-surface shadow-glow'
                : 'border-line bg-surface shadow-card hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover',
            )}
          >
            <div
              className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', card.accent)}
              aria-hidden
            />
            <div className="relative">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  card.iconClass,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>

              <p className="mt-4 font-display text-3xl font-bold tabular text-content">
                {stats[card.key]}
              </p>
              <p className="mt-0.5 text-sm font-medium text-content">{card.label}</p>
              <p className="mt-1 text-xs text-content-subtle">{card.hint(stats)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
