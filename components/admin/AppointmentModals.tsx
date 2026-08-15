'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ApiError, adminService, appointmentService } from '@/services';
import { STATUS_STYLES, formatDateLong, formatTime12h, validators } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge, InlineError } from '@/components/ui/Feedback';
import type { Appointment, AppointmentStatus, DayAvailability } from '@/types';

/**
 * Admin detail and edit dialogs.
 *
 * The edit form can move an appointment to any date and time, but the *server*
 * revalidates the destination exactly as it would a new booking — closed days,
 * out-of-hours times and occupied slots are all refused, and a concurrent clash
 * is caught by the database constraint. The time dropdown here is a
 * convenience built from live availability, not the rule.
 */

const STATUS_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: 'BOOKED', label: 'Booked' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function AppointmentDetailModal({
  appointment,
  onClose,
  onEdit,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
}) {
  if (!appointment) return null;
  const status = STATUS_STYLES[appointment.status];

  return (
    <Modal
      open
      onClose={onClose}
      title="Appointment details"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              onClose();
              onEdit(appointment);
            }}
          >
            Edit appointment
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl bg-brand-500/8 px-4 py-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-brand-on-solid">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-content">
              {formatDateLong(appointment.appointmentDate)}
            </p>
            <p className="flex items-center gap-1.5 text-sm tabular text-content-muted">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatTime12h(appointment.startTime)} – {formatTime12h(appointment.endTime)}
            </p>
          </div>
          <Badge className={`${status.badge} ml-auto shrink-0`} dot={status.dot}>
            {status.label}
          </Badge>
        </div>

        <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          <DetailRow icon={UserIcon} label="Patient" value={appointment.patientName} />
          <DetailRow
            icon={Mail}
            label="Email"
            value={appointment.patientEmail}
            href={`mailto:${appointment.patientEmail}`}
          />
          <DetailRow
            icon={Phone}
            label="Phone"
            value={appointment.patientPhone}
            href={`tel:${appointment.patientPhone.replace(/[^\d+]/g, '')}`}
          />
          <DetailRow label="Reason" value={appointment.reason} />
          {appointment.serviceName && (
            <DetailRow label="Treatment" value={appointment.serviceName} />
          )}
          {appointment.notes && <DetailRow label="Notes" value={appointment.notes} />}
          <DetailRow label="Booked via" value={appointment.source} />
          <DetailRow
            label="Account"
            value={appointment.userId ? 'Registered patient' : 'Guest booking (no account)'}
          />
          <DetailRow label="Reference" value={appointment.id.slice(0, 8).toUpperCase()} />
          <DetailRow
            label="Created"
            value={new Date(appointment.createdAt).toLocaleString('en-GB')}
          />
          {appointment.completedAt && (
            <DetailRow
              label="Completed"
              value={new Date(appointment.completedAt).toLocaleString('en-GB')}
            />
          )}
          {appointment.cancelledAt && (
            <DetailRow
              label="Cancelled"
              value={new Date(appointment.cancelledAt).toLocaleString('en-GB')}
            />
          )}
        </dl>
      </div>
    </Modal>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon?: typeof UserIcon;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex gap-4 bg-surface px-4 py-3">
      <dt className="flex w-28 shrink-0 items-center gap-1.5 text-sm text-content-subtle">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-sm text-content">
        {href ? (
          <a href={href} className="hover:text-brand-700 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function AppointmentEditModal({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();

  const [form, setForm] = useState({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    appointmentDate: '',
    startTime: '',
    reason: '',
    notes: '',
    status: 'BOOKED' as AppointmentStatus,
  });
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    setForm({
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      patientPhone: appointment.patientPhone,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      reason: appointment.reason,
      notes: appointment.notes ?? '',
      status: appointment.status,
    });
    setFieldErrors({});
    setError(null);
  }, [appointment]);

  // Load availability for whichever date is selected, so the time dropdown
  // shows what is actually free — plus the appointment's own current slot,
  // which is occupied by this very booking.
  useEffect(() => {
    if (!form.appointmentDate || !appointment) return;
    let cancelled = false;

    appointmentService
      .getAvailability(form.appointmentDate)
      .then((result) => {
        if (!cancelled) setAvailability(result);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      });

    return () => {
      cancelled = true;
    };
  }, [form.appointmentDate, appointment]);

  if (!appointment) return null;

  const timeOptions = (() => {
    const free = availability?.available ?? [];
    const isOriginalDate = form.appointmentDate === appointment.appointmentDate;
    // Keep the current time selectable when the date has not moved.
    const values = isOriginalDate ? [...new Set([appointment.startTime, ...free])].sort() : free;

    if (values.length === 0) {
      return [
        {
          value: form.startTime,
          label: `${formatTime12h(form.startTime)} (no free slots)`,
        },
      ];
    }
    return values.map((time) => ({
      value: time,
      label:
        time === appointment.startTime && isOriginalDate
          ? `${formatTime12h(time)} (current)`
          : formatTime12h(time),
    }));
  })();

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    const nameError = validators.name(form.patientName);
    const emailError = validators.email(form.patientEmail);
    const phoneError = validators.phone(form.patientPhone);
    const reasonError = validators.reason(form.reason);

    if (nameError) errors.patientName = nameError;
    if (emailError) errors.patientEmail = emailError;
    if (phoneError) errors.patientPhone = phoneError;
    if (reasonError) errors.reason = reasonError;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);

    try {
      await adminService.updateAppointment(appointment.id, {
        patientName: form.patientName.trim(),
        patientEmail: form.patientEmail.trim(),
        patientPhone: form.patientPhone.trim(),
        appointmentDate: form.appointmentDate,
        startTime: form.startTime,
        reason: form.reason.trim(),
        notes: form.notes.trim() || null,
        status: form.status,
      });
      toast.success('Appointment updated');
      onSaved();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
        const serverFieldErrors = requestError.fieldErrors;
        if (Object.keys(serverFieldErrors).length > 0) setFieldErrors(serverFieldErrors);
      } else {
        setError('Could not save the changes.');
      }
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      dismissible={!saving}
      title="Edit appointment"
      description={`Reference ${appointment.id.slice(0, 8).toUpperCase()}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <InlineError message={error} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Patient name"
            value={form.patientName}
            onChange={(event) => setForm({ ...form, patientName: event.target.value })}
            error={fieldErrors.patientName}
            leftIcon={<UserIcon className="h-4 w-4" />}
          />
          <Input
            label="Phone"
            value={form.patientPhone}
            onChange={(event) => setForm({ ...form, patientPhone: event.target.value })}
            error={fieldErrors.patientPhone}
            leftIcon={<Phone className="h-4 w-4" />}
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={form.patientEmail}
          onChange={(event) => setForm({ ...form, patientEmail: event.target.value })}
          error={fieldErrors.patientEmail}
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            min={today}
            value={form.appointmentDate}
            onChange={(event) => setForm({ ...form, appointmentDate: event.target.value })}
            error={fieldErrors.appointmentDate}
            hint={
              availability && !availability.isOpen
                ? `Closed on ${availability.dayName}s`
                : availability
                  ? `${availability.available.length} slots free`
                  : undefined
            }
          />
          <Select
            label="Time"
            value={form.startTime}
            onChange={(event) =>
              setForm({
                ...form,
                startTime: (event.target as HTMLSelectElement).value,
              })
            }
            options={timeOptions}
            error={fieldErrors.startTime}
          />
        </div>

        <Input
          label="Reason for visit"
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
          error={fieldErrors.reason}
        />

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          rows={3}
          placeholder="Clinical notes, patient preferences, anything the team should know…"
        />

        <Select
          label="Status"
          value={form.status}
          onChange={(event) =>
            setForm({
              ...form,
              status: (event.target as HTMLSelectElement).value as AppointmentStatus,
            })
          }
          options={STATUS_OPTIONS}
          hint="Completed and booked appointments both keep their slot reserved. Cancelling releases it."
        />
      </div>
    </Modal>
  );
}
