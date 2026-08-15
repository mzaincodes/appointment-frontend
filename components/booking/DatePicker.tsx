'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { appointmentService } from '@/services';
import {
  addDays,
  cn,
  formatDayOfMonth,
  formatMonthYear,
  formatWeekday,
  isToday,
  todayISO,
} from '@/lib/utils';
import { Skeleton } from '@/components/ui/Feedback';
import type { DaySummary } from '@/types';

/**
 * Horizontal date strip.
 *
 * Shows two weeks at a time with a live capacity summary per day, so a patient
 * can see at a glance which days are open, busy or full before spending a click
 * on one. The counts come from the availability API — the component has no idea
 * what the clinic's hours are, which is exactly the point.
 *
 * A vertical month grid was the alternative; a horizontal strip won because it
 * behaves identically on mobile and desktop and keeps the slot grid above the
 * fold on a phone.
 */

const WINDOW_DAYS = 14;

interface DatePickerProps {
  selected: string | null;
  onSelect: (date: string) => void;
}

export function DatePicker({ selected, onSelect }: DatePickerProps) {
  const today = useMemo(() => todayISO(), []);
  const [windowStart, setWindowStart] = useState(today);
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    setError(false);

    appointmentService
      .getAvailabilityRange(windowStart, WINDOW_DAYS)
      .then((result) => {
        if (!cancelled) setDays(result.days);
      })
      .catch(() => {
        // A failed summary must not block booking — the strip degrades to plain
        // dates and the slot grid still reports the truth for whichever day is
        // picked.
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [windowStart]);

  // Scroll the selected day into view when the window shifts around it.
  useEffect(() => {
    if (!selected || !scrollRef.current) return;
    const element = scrollRef.current.querySelector<HTMLElement>(`[data-date="${selected}"]`);
    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selected, days]);

  const canGoBack = windowStart > today;
  const fallbackDays: DaySummary[] = useMemo(
    () =>
      Array.from({ length: WINDOW_DAYS }, (_, index) => {
        const date = addDays(windowStart, index);
        return {
          date,
          dayName: formatWeekday(date, 'long'),
          isOpen: new Date(`${date}T12:00:00Z`).getUTCDay() !== 0,
          availableCount: 0,
          totalSlots: 16,
          isPast: false,
        };
      }),
    [windowStart],
  );

  const visible = days ?? (error ? fallbackDays : null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-content">{formatMonthYear(windowStart)}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setWindowStart(addDays(windowStart, -WINDOW_DAYS))}
            disabled={!canGoBack}
            aria-label="Previous two weeks"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-content-muted transition-colors hover:border-line-strong hover:text-content disabled:opacity-40 disabled:hover:border-line"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWindowStart(addDays(windowStart, WINDOW_DAYS))}
            aria-label="Next two weeks"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-content-muted transition-colors hover:border-line-strong hover:text-content"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
        role="radiogroup"
        aria-label="Choose a date"
      >
        {visible === null
          ? Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-[86px] w-[68px] shrink-0 rounded-xl" />
            ))
          : visible.map((day) => {
              const isSelected = day.date === selected;
              // A day is pickable when the clinic opens and something is free.
              // Closed days stay visible but disabled — hiding them makes the
              // calendar look broken rather than explaining Sunday.
              const disabled =
                !day.isOpen || day.isPast || (days !== null && day.availableCount === 0);
              const isFull = day.isOpen && !day.isPast && days !== null && day.availableCount === 0;

              return (
                <button
                  key={day.date}
                  type="button"
                  data-date={day.date}
                  role="radio"
                  aria-checked={isSelected}
                  disabled={disabled}
                  onClick={() => onSelect(day.date)}
                  title={
                    !day.isOpen
                      ? `Closed on ${day.dayName}s`
                      : isFull
                        ? 'Fully booked'
                        : `${day.availableCount} times available`
                  }
                  className={cn(
                    'group relative flex w-[68px] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5',
                    'transition-all duration-200',
                    isSelected
                      ? 'border-brand-500 bg-brand-solid text-brand-on-solid shadow-glow'
                      : disabled
                        ? 'cursor-not-allowed border-line bg-surface-sunken/60 text-content-subtle opacity-60'
                        : 'border-line bg-surface text-content hover:border-brand-500/60 hover:bg-brand-500/8 active:scale-95',
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wide',
                      isSelected ? 'text-brand-on-solid/80' : 'text-content-subtle',
                    )}
                  >
                    {formatWeekday(day.date)}
                  </span>
                  <span className="font-display text-lg font-bold leading-tight tabular">
                    {formatDayOfMonth(day.date)}
                  </span>

                  {/* Capacity hint — the reason the strip is worth the space. */}
                  <span
                    className={cn(
                      'text-[9px] font-medium leading-tight',
                      isSelected
                        ? 'text-brand-on-solid/80'
                        : !day.isOpen
                          ? 'text-content-subtle'
                          : isFull
                            ? 'text-danger-fg'
                            : day.availableCount <= 3
                              ? 'text-warning-fg'
                              : 'text-success-fg',
                    )}
                  >
                    {!day.isOpen
                      ? 'Closed'
                      : days === null
                        ? '·'
                        : isFull
                          ? 'Full'
                          : `${day.availableCount} free`}
                  </span>

                  {isToday(day.date) && !isSelected && (
                    <span
                      className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-brand-500"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
      </div>
    </div>
  );
}
