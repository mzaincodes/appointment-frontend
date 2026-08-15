'use client';

import { CalendarOff, Check, Clock, Sunrise, Sunset } from 'lucide-react';
import { cn, formatTime12h } from '@/lib/utils';
import { EmptyState, ErrorState, SlotGridSkeleton } from '@/components/ui/Feedback';
import type { DayAvailability } from '@/types';

/**
 * Slot grid.
 *
 * Renders exactly what the availability API returns — the browser holds no
 * schedule of its own, so what is shown can never disagree with what the server
 * will accept.
 *
 * Unavailable slots are shown and disabled rather than hidden. A grid that
 * silently omits 11:00 looks broken; one that shows 11:00 struck through and
 * labelled "Booked" explains itself.
 *
 * Four visual states:
 * available  — solid border, hover lift, clickable
 * selected   — filled brand, check mark
 * booked     — struck through, muted, not clickable
 * past       — faded, not clickable (today only)
 */

interface SlotPickerProps {
  availability: DayAvailability | null;
  loading: boolean;
  error: string | null;
  selected: string | null;
  onSelect: (time: string) => void;
  onRetry: () => void;
}

export function SlotPicker({
  availability,
  loading,
  error,
  selected,
  onSelect,
  onRetry,
}: SlotPickerProps) {
  if (loading) return <SlotGridSkeleton />;

  if (error) {
    return <ErrorState title="Could not load available times" message={error} onRetry={onRetry} />;
  }

  if (!availability) return null;

  if (!availability.isOpen) {
    return (
      <EmptyState
        icon={<CalendarOff className="h-6 w-6" />}
        title={`We're closed on ${availability.dayName}s`}
        description={
          availability.message ??
          'The clinic is open Monday to Saturday, 9:00 AM to 5:00 PM. Please choose another date.'
        }
      />
    );
  }

  if (availability.slots.length === 0 || availability.available.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-6 w-6" />}
        title="Fully booked"
        description={
          availability.message ??
          'Every appointment on this day has been taken. Please try another date.'
        }
      />
    );
  }

  // Split at midday so the grid reads as a working day rather than 16 tiles.
  const morning = availability.slots.filter((slot) => slot.time < '12:00');
  const afternoon = availability.slots.filter((slot) => slot.time >= '12:00');

  return (
    <div className="space-y-6">
      <SlotGroup
        label="Morning"
        icon={<Sunrise className="h-3.5 w-3.5" />}
        slots={morning}
        selected={selected}
        onSelect={onSelect}
      />
      <SlotGroup
        label="Afternoon"
        icon={<Sunset className="h-3.5 w-3.5" />}
        slots={afternoon}
        selected={selected}
        onSelect={onSelect}
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-content-subtle">
        <LegendItem className="border-line bg-surface">Available</LegendItem>
        <LegendItem className="border-brand-500 bg-brand-solid">Selected</LegendItem>
        <LegendItem className="border-line bg-surface-sunken line-through">Booked</LegendItem>
      </div>
    </div>
  );
}

function SlotGroup({
  label,
  icon,
  slots,
  selected,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  slots: DayAvailability['slots'];
  selected: string | null;
  onSelect: (time: string) => void;
}) {
  if (slots.length === 0) return null;

  const availableCount = slots.filter((slot) => slot.available).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-content-subtle">
          {icon}
          {label}
        </h3>
        <span className="text-xs text-content-subtle">
          {availableCount} of {slots.length} free
        </span>
      </div>

      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
        role="radiogroup"
        aria-label={`${label} appointment times`}
      >
        {slots.map((slot) => {
          const isSelected = slot.time === selected;
          return (
            <button
              key={slot.time}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!slot.available}
              onClick={() => onSelect(slot.time)}
              // Screen readers get the reason, which the strike-through only
              // conveys visually.
              aria-label={
                slot.available
                  ? `${slot.label}, available`
                  : `${slot.label}, ${slot.reason === 'BOOKED' ? 'already booked' : 'no longer available'}`
              }
              className={cn(
                'group relative flex flex-col items-center justify-center rounded-xl border px-2 py-3',
                'transition-all duration-200',
                isSelected
                  ? 'border-brand-500 bg-brand-solid text-brand-on-solid shadow-glow'
                  : slot.available
                    ? 'border-line bg-surface text-content hover:-translate-y-0.5 hover:border-brand-500/70 hover:bg-brand-500/8 hover:shadow-card active:translate-y-0 active:scale-95'
                    : 'cursor-not-allowed border-line bg-surface-sunken/60 text-content-subtle',
              )}
            >
              <span
                className={cn(
                  'text-sm font-semibold tabular',
                  !slot.available && 'line-through decoration-1',
                )}
              >
                {formatTime12h(slot.time)}
              </span>

              {isSelected ? (
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium">
                  <Check className="h-3 w-3" />
                  Selected
                </span>
              ) : (
                <span className="mt-0.5 text-[10px] text-content-subtle">
                  {slot.available
                    ? '30 min'
                    : slot.reason === 'BOOKED'
                      ? 'Booked'
                      : slot.reason === 'PAST'
                        ? 'Passed'
                        : 'Unavailable'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LegendItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-3.5 w-6 rounded border', className)} aria-hidden />
      {children}
    </span>
  );
}
