'use client';

import { CalendarDays, Clock, FileText, MapPin, MoreVertical, StickyNote, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  STATUS_STYLES,
  cn,
  formatDateLong,
  formatRelativeDay,
  formatTime12h,
  isPastDate,
} from '@/lib/utils';
import { Badge } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import type { Appointment } from '@/types';

/**
 * A patient's own appointment card.
 *
 * The action menu only appears when an action is genuinely possible — a
 * completed or cancelled appointment shows no menu at all, rather than a menu
 * whose items all fail. The same rules are enforced server-side; this just
 * avoids offering something that will be refused.
 */
export function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
}: {
  appointment: Appointment;
  onCancel: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  const status = STATUS_STYLES[appointment.status];
  const isPast = isPastDate(appointment.appointmentDate);
  const canModify = appointment.status === 'BOOKED' && !isPast;

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-surface p-5 shadow-card transition-all duration-300',
        canModify ? 'border-line hover:border-line-strong hover:shadow-card-hover' : 'border-line',
        appointment.status === 'CANCELLED' && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-4">
        {/* Date block — reads as a calendar tear-off. */}
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border',
            appointment.status === 'CANCELLED'
              ? 'border-line bg-surface-sunken text-content-subtle'
              : 'border-brand-500/25 bg-brand-500/10 text-brand-text',
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide">
            {formatDateLong(appointment.appointmentDate).split(' ')[2]?.slice(0, 3)}
          </span>
          <span className="font-display text-lg font-bold leading-none tabular">
            {appointment.appointmentDate.slice(8)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold text-content">
              {appointment.reason}
            </h3>
            <Badge className={status.badge} dot={status.dot}>
              {status.label}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-content-muted">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {formatRelativeDay(appointment.appointmentDate)} ·{' '}
              {formatDateLong(appointment.appointmentDate)}
            </span>
            <span className="flex items-center gap-1.5 tabular">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {formatTime12h(appointment.startTime)} – {formatTime12h(appointment.endTime)}
            </span>
          </div>

          {appointment.serviceName && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-content-muted">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {appointment.serviceName}
            </p>
          )}

          {appointment.notes && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-sunken px-3 py-2 text-xs leading-relaxed text-content-muted">
              <StickyNote className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {appointment.notes}
            </p>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-xs text-content-subtle">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            218 Marina Boulevard, Suite 300 · Ref{' '}
            <span className="font-mono">{appointment.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        {canModify && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Appointment actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="rounded-lg p-1.5 text-content-subtle transition-colors hover:bg-surface-sunken hover:text-content"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-9 z-20 w-44 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lifted"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onReschedule(appointment);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content-muted transition-colors hover:bg-surface-sunken hover:text-content"
                >
                  <CalendarDays className="h-4 w-4" />
                  Reschedule
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onCancel(appointment);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content-muted transition-colors hover:bg-danger-bg hover:text-danger-fg"
                >
                  <X className="h-4 w-4" />
                  Cancel appointment
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {canModify && (
        <div className="mt-4 flex gap-2 border-t border-line pt-4 sm:hidden">
          <Button variant="secondary" size="sm" fullWidth onClick={() => onReschedule(appointment)}>
            Reschedule
          </Button>
          <Button variant="ghost" size="sm" fullWidth onClick={() => onCancel(appointment)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
