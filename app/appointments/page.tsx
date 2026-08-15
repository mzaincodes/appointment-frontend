'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, CalendarX2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ApiError, appointmentService } from '@/services';
import { cn, formatDateLong, formatTime12h, isPastDate } from '@/lib/utils';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { RescheduleModal } from '@/components/appointments/RescheduleModal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import { AppointmentListSkeleton, EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Footer } from '@/components/layout/Footer';
import type { Appointment } from '@/types';

/**
 *"My appointments".
 *
 * Grouped into upcoming and past rather than offered as one long list —
 *"what's next" is the question people open this page to answer.
 *
 * The list is refetched after every mutation instead of being patched locally.
 * It is one cheap request, and it guarantees what is shown matches the database
 * — including changes an admin made in the meantime.
 */

type Tab = 'upcoming' | 'past' | 'all';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
];

function AppointmentsContent() {
  const toast = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await appointmentService.list({
        pageSize: 100,
        sort: 'date_desc',
      });
      setAppointments(result.items);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Could not load your appointments.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { upcoming, past } = useMemo(() => {
    const upcomingList: Appointment[] = [];
    const pastList: Appointment[] = [];

    for (const appointment of appointments) {
      // Cancelled appointments belong in history regardless of their date —
      // they are not something the patient still needs to turn up for.
      const isHistory =
        isPastDate(appointment.appointmentDate) ||
        appointment.status === 'COMPLETED' ||
        appointment.status === 'CANCELLED';
      (isHistory ? pastList : upcomingList).push(appointment);
    }

    upcomingList.sort((a, b) =>
      `${a.appointmentDate}${a.startTime}`.localeCompare(`${b.appointmentDate}${b.startTime}`),
    );
    return { upcoming: upcomingList, past: pastList };
  }, [appointments]);

  const visible = tab === 'upcoming' ? upcoming : tab === 'past' ? past : appointments;

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await appointmentService.cancel(cancelTarget.id);
      toast.success(
        'Appointment cancelled',
        `${formatDateLong(cancelTarget.appointmentDate)} at ${formatTime12h(cancelTarget.startTime)} is now free.`,
      );
      setCancelTarget(null);
      await load();
    } catch (requestError) {
      toast.error(
        'Could not cancel',
        requestError instanceof ApiError ? requestError.message : 'Please try again.',
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-content">
              My appointments
            </h1>
            <p className="mt-1.5 text-sm text-content-muted">
              View, reschedule or cancel your visits.
            </p>
          </div>
          <Link href="/book">
            <Button leftIcon={<CalendarPlus className="h-4 w-4" />}>Book new</Button>
          </Link>
        </div>

        <div className="mt-7 flex gap-1 rounded-xl border border-line bg-surface-sunken p-1">
          {TABS.map((entry) => {
            const count =
              entry.id === 'upcoming'
                ? upcoming.length
                : entry.id === 'past'
                  ? past.length
                  : appointments.length;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  tab === entry.id
                    ? 'bg-surface text-content shadow-sm'
                    : 'text-content-muted hover:text-content',
                )}
              >
                {entry.label}
                {!loading && (
                  <span className="ml-1.5 text-xs text-content-subtle tabular">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {loading ? (
            <AppointmentListSkeleton rows={3} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<CalendarX2 className="h-6 w-6" />}
              title={
                tab === 'upcoming'
                  ? 'No upcoming appointments'
                  : tab === 'past'
                    ? 'Nothing in your history yet'
                    : 'No appointments yet'
              }
              description={
                tab === 'past'
                  ? 'Once you have visited us, your past appointments will appear here.'
                  : 'Book a 30-minute appointment and it will show up here straight away.'
              }
              action={
                tab !== 'past' && (
                  <Link href="/book">
                    <Button leftIcon={<CalendarPlus className="h-4 w-4" />}>
                      Book an appointment
                    </Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {visible.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCancel={setCancelTarget}
                  onReschedule={setRescheduleTarget}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void handleCancel()}
        loading={cancelling}
        title="Cancel this appointment?"
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep it"
        message={
          cancelTarget ? (
            <>
              Your appointment on <strong>{formatDateLong(cancelTarget.appointmentDate)}</strong> at{' '}
              <strong>{formatTime12h(cancelTarget.startTime)}</strong> will be cancelled and the
              slot released for other patients. This cannot be undone.
            </>
          ) : null
        }
      />

      <RescheduleModal
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => {
          setRescheduleTarget(null);
          void load();
        }}
      />

      <Footer />
    </>
  );
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute>
      <AppointmentsContent />
    </ProtectedRoute>
  );
}
