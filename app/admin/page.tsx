'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { ApiError, adminService } from '@/services';
import { cn, formatDateLong, formatTime12h } from '@/lib/utils';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { StatCards } from '@/components/admin/StatCards';
import { AppointmentTable } from '@/components/admin/AppointmentTable';
import { AppointmentDetailModal, AppointmentEditModal } from '@/components/admin/AppointmentModals';
import { AppointmentCreateModal } from '@/components/admin/AppointmentCreateModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/Feedback';
import type { Appointment, AppointmentStats, AppointmentStatus } from '@/types';

/**
 * Admin dashboard.
 *
 * Filters are held as component state and translated into query parameters —
 * the backend does the filtering, searching, sorting and pagination, so this
 * page never holds the full appointment table in memory.
 *
 * Every destructive action goes through a confirmation dialog, and every
 * mutation refetches both the list and the statistics so the counters and the
 * rows can never disagree.
 */

type StatusFilter = 'all' | AppointmentStatus;
type ScopeFilter = 'all' | 'today' | 'upcoming' | 'past';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'BOOKED', label: 'Booked' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

const SCOPE_TABS: Array<{ id: ScopeFilter; label: string }> = [
  { id: 'all', label: 'Any date' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
];

const PAGE_SIZE = 20;

function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'complete' | 'cancel' | 'delete';
    appointment: Appointment;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce the search box so a query is not issued on every keystroke.
  const searchTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(searchTimer.current);
  }, [searchInput]);

  const loadAppointments = useCallback(async () => {
    setError(null);
    try {
      const result = await adminService.listAppointments({
        ...(status !== 'all' ? { status: [status] } : {}),
        ...(scope !== 'all' ? { scope } : {}),
        ...(search ? { search } : {}),
        page,
        pageSize: PAGE_SIZE,
        sort: scope === 'past' ? 'date_desc' : 'date_asc',
      });
      setAppointments(result.items);
      setTotal(result.total);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError ? requestError.message : 'Could not load appointments.',
      );
    }
  }, [status, scope, search, page]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await adminService.getStats());
    } catch {
      // The counters are supplementary; the table is what matters.
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadAppointments().finally(() => setLoading(false));
  }, [loadAppointments]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAppointments(), loadStats()]);
    setRefreshing(false);
  }, [loadAppointments, loadStats]);

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, appointment } = confirmAction;

    setActionLoading(true);
    try {
      if (type === 'complete') {
        await adminService.complete(appointment.id);
        toast.success(
          'Marked as completed',
          'The slot stays reserved and off the public calendar.',
        );
      } else if (type === 'cancel') {
        await adminService.cancel(appointment.id);
        toast.success('Appointment cancelled', 'The slot is now available to book again.');
      } else {
        await adminService.remove(appointment.id);
        toast.success('Appointment deleted');
      }
      setConfirmAction(null);
      await refreshAll();
    } catch (requestError) {
      toast.error(
        'Action failed',
        requestError instanceof ApiError ? requestError.message : 'Please try again.',
      );
    } finally {
      setActionLoading(false);
    }
  };

  /** Exports the current page as CSV — a common ask for reception. */
  const exportCsv = () => {
    const headers = ['Date', 'Time', 'Patient', 'Email', 'Phone', 'Reason', 'Status', 'Source'];
    const rows = appointments.map((appointment) => [
      appointment.appointmentDate,
      appointment.startTime,
      appointment.patientName,
      appointment.patientEmail,
      appointment.patientPhone,
      appointment.reason,
      appointment.status,
      appointment.source,
    ]);

    // Quote every field and double any embedded quotes, so a comma in a reason
    // cannot break the column alignment.
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported', `${appointments.length} appointments downloaded.`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeStatCard = useMemo(() => {
    if (scope === 'today') return 'today';
    if (scope === 'upcoming' && status === 'BOOKED') return 'upcoming';
    if (status === 'COMPLETED' && scope === 'all') return 'completed';
    if (status === 'CANCELLED' && scope === 'all') return 'cancelled';
    return null;
  }, [status, scope]);

  const confirmCopy = {
    complete: {
      title: 'Mark as completed?',
      confirmLabel: 'Mark completed',
      variant: 'primary' as const,
      body: 'The appointment will be recorded as completed. Its slot stays reserved, so it will not reappear as available to patients.',
    },
    cancel: {
      title: 'Cancel this appointment?',
      confirmLabel: 'Cancel appointment',
      variant: 'danger' as const,
      body: 'The appointment will be marked cancelled and its slot released for other patients to book.',
    },
    delete: {
      title: 'Delete permanently?',
      confirmLabel: 'Delete',
      variant: 'danger' as const,
      body: 'This removes the appointment and its history entirely. Cancelling is usually the better choice, as it keeps the record. This cannot be undone.',
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-content sm:text-3xl">
            Clinic dashboard
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            Signed in as {user?.name} ·{' '}
            {new Date().toLocaleDateString('en-GB', { dateStyle: 'full' })}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refreshAll()}
            loading={refreshing}
            leftIcon={!refreshing ? <RefreshCw className="h-3.5 w-3.5" /> : undefined}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={appointments.length === 0}
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            Export
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            New appointment
          </Button>
        </div>
      </div>

      <div className="mt-7">
        <StatCards
          stats={stats}
          loading={statsLoading}
          activeFilter={activeStatCard}
          onFilter={(key) => {
            setPage(1);
            // Each card maps onto the filter combination it counts.
            if (key === 'today') {
              setScope('today');
              setStatus('all');
            } else if (key === 'upcoming') {
              setScope('upcoming');
              setStatus('BOOKED');
            } else if (key === 'completed') {
              setScope('all');
              setStatus('COMPLETED');
            } else {
              setScope('all');
              setStatus('CANCELLED');
            }
          }}
        />
      </div>

      {/* Filters */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-sunken p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatus(tab.id);
                  setPage(1);
                }}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
                  status === tab.id
                    ? 'bg-surface text-content shadow-sm'
                    : 'text-content-muted hover:text-content',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-sunken p-1">
            {SCOPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setScope(tab.id);
                  setPage(1);
                }}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
                  scope === tab.id
                    ? 'bg-surface text-content shadow-sm'
                    : 'text-content-muted hover:text-content',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by patient name, email or reason…"
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search appointments"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-content-subtle transition-colors hover:text-content"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={() => void loadAppointments()} />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between text-sm text-content-muted">
              <p>
                {loading ? (
                  'Loading…'
                ) : (
                  <>
                    <span className="font-medium text-content tabular">{total}</span> appointment
                    {total === 1 ? '' : 's'}
                    {search && <> matching &ldquo;{search}&rdquo;</>}
                  </>
                )}
              </p>
              {totalPages > 1 && (
                <p className="tabular">
                  Page {page} of {totalPages}
                </p>
              )}
            </div>

            <AppointmentTable
              appointments={appointments}
              loading={loading}
              actions={{
                onView: setDetailTarget,
                onEdit: setEditTarget,
                onComplete: (appointment) => setConfirmAction({ type: 'complete', appointment }),
                onCancel: (appointment) => setConfirmAction({ type: 'cancel', appointment }),
                onDelete: (appointment) => setConfirmAction({ type: 'delete', appointment }),
              }}
            />

            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                >
                  Previous
                </Button>
                <span className="px-3 text-sm tabular text-content-muted">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AppointmentCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void refreshAll();
        }}
      />

      <AppointmentDetailModal
        appointment={detailTarget}
        onClose={() => setDetailTarget(null)}
        onEdit={setEditTarget}
      />

      <AppointmentEditModal
        appointment={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          void refreshAll();
        }}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void handleConfirmedAction()}
        loading={actionLoading}
        title={confirmAction ? confirmCopy[confirmAction.type].title : ''}
        confirmLabel={confirmAction ? confirmCopy[confirmAction.type].confirmLabel : ''}
        variant={confirmAction ? confirmCopy[confirmAction.type].variant : 'danger'}
        message={
          confirmAction ? (
            <>
              <strong>{confirmAction.appointment.patientName}</strong> —{' '}
              {formatDateLong(confirmAction.appointment.appointmentDate)} at{' '}
              {formatTime12h(confirmAction.appointment.startTime)}.
              <br />
              <br />
              {confirmCopy[confirmAction.type].body}
            </>
          ) : null
        }
      />
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  );
}
