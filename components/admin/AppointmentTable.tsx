'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CalendarX2,
  Check,
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  X,
} from 'lucide-react';
import {
  STATUS_STYLES,
  cn,
  formatDateShort,
  formatRelativeDay,
  formatTime12h,
  initials,
} from '@/lib/utils';
import { Badge, EmptyState, TableSkeleton } from '@/components/ui/Feedback';
import type { Appointment } from '@/types';

/**
 * Admin appointments table.
 *
 * A real table on desktop and a stack of cards below `lg` — a horizontally
 * scrolling table on a phone is technically responsive and practically
 * unusable, so the layout changes rather than the scale.
 *
 * Row actions are gated by status: a cancelled appointment cannot be completed,
 * a completed one cannot be cancelled. The server enforces the same
 * transitions; this only avoids offering a button that will fail.
 */

export interface TableActions {
  onView: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onComplete: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}

export function AppointmentTable({
  appointments,
  loading,
  actions,
}: {
  appointments: Appointment[];
  loading: boolean;
  actions: TableActions;
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <TableSkeleton rows={6} columns={5} />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX2 className="h-6 w-6" />}
        title="No appointments match"
        description="Try adjusting the filters or clearing the search to see more results."
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:block">
        <table className="w-full">
          <caption className="sr-only">Clinic appointments</caption>
          <thead>
            <tr className="border-b border-line bg-surface-sunken/60">
              <Th>Patient</Th>
              <Th>Date &amp; time</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
              <Th>Source</Th>
              <th className="w-12 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {appointments.map((appointment) => {
              const status = STATUS_STYLES[appointment.status];
              return (
                <tr
                  key={appointment.id}
                  className="group transition-colors hover:bg-surface-sunken/50"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-xs font-bold text-brand-text">
                        {initials(appointment.patientName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-content">
                          {appointment.patientName}
                        </p>
                        <p className="truncate text-xs text-content-subtle">
                          {appointment.patientEmail}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <p className="text-sm text-content">
                      {formatRelativeDay(appointment.appointmentDate)}
                    </p>
                    <p className="text-xs tabular text-content-subtle">
                      {formatDateShort(appointment.appointmentDate)} ·{' '}
                      {formatTime12h(appointment.startTime)}
                    </p>
                  </td>

                  <td className="max-w-[220px] px-4 py-3.5">
                    <p className="truncate text-sm text-content" title={appointment.reason}>
                      {appointment.reason}
                    </p>
                    {appointment.serviceName && (
                      <p className="truncate text-xs text-content-subtle">
                        {appointment.serviceName}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <Badge className={status.badge} dot={status.dot}>
                      {status.label}
                    </Badge>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="rounded-md bg-surface-sunken px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-content-subtle">
                      {appointment.source}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <RowMenu appointment={appointment} actions={actions} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {appointments.map((appointment) => {
          const status = STATUS_STYLES[appointment.status];
          return (
            <div
              key={appointment.id}
              className="rounded-2xl border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-xs font-bold text-brand-text">
                    {initials(appointment.patientName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content">
                      {appointment.patientName}
                    </p>
                    <p className="truncate text-xs text-content-subtle">
                      {formatDateShort(appointment.appointmentDate)} ·{' '}
                      {formatTime12h(appointment.startTime)}
                    </p>
                  </div>
                </div>
                <RowMenu appointment={appointment} actions={actions} />
              </div>

              <p className="mt-3 text-sm text-content">{appointment.reason}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className={status.badge} dot={status.dot}>
                  {status.label}
                </Badge>
                <span className="rounded-md bg-surface-sunken px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-content-subtle">
                  {appointment.source}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3 text-xs text-content-muted">
                <a
                  href={`mailto:${appointment.patientEmail}`}
                  className="flex items-center gap-1.5 hover:text-content"
                >
                  <Mail className="h-3 w-3" />
                  Email
                </a>
                <a
                  href={`tel:${appointment.patientPhone.replace(/[^\d+]/g, '')}`}
                  className="flex items-center gap-1.5 hover:text-content"
                >
                  <Phone className="h-3 w-3" />
                  {appointment.patientPhone}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-content-subtle"
    >
      {children}
    </th>
  );
}

function RowMenu({ appointment, actions }: { appointment: Appointment; actions: TableActions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const canComplete = appointment.status === 'BOOKED';
  const canCancel = appointment.status === 'BOOKED';

  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Actions for ${appointment.patientName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-lg p-1.5 text-content-subtle transition-colors hover:bg-surface-sunken hover:text-content"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-30 w-52 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lifted"
        >
          <MenuItem icon={Eye} onClick={run(() => actions.onView(appointment))}>
            View details
          </MenuItem>
          <MenuItem icon={Pencil} onClick={run(() => actions.onEdit(appointment))}>
            Edit appointment
          </MenuItem>

          {canComplete && (
            <MenuItem
              icon={Check}
              onClick={run(() => actions.onComplete(appointment))}
              className="text-success-fg hover:bg-success-bg"
            >
              Mark as completed
            </MenuItem>
          )}
          {canCancel && (
            <MenuItem
              icon={X}
              onClick={run(() => actions.onCancel(appointment))}
              className="text-warning-fg hover:bg-warning-bg"
            >
              Cancel appointment
            </MenuItem>
          )}

          <div className="my-1 h-px bg-line" role="separator" />
          <MenuItem
            icon={Trash2}
            onClick={run(() => actions.onDelete(appointment))}
            className="text-danger-fg hover:bg-danger-bg"
          >
            Delete permanently
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  onClick,
  className,
  children,
}: {
  icon: typeof Eye;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content-muted transition-colors hover:bg-surface-sunken hover:text-content',
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}
