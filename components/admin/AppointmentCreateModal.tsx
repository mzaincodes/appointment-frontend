'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, Phone, User as UserIcon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ApiError, adminService, appointmentService } from '@/services';
import { formatDateLong, formatTime12h, todayISO, validators } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/Feedback';
import type { DayAvailability } from '@/types';

/**
 * Book an appointment on a patient's behalf, from the dashboard.
 *
 * Staff no longer use the public `/book` flow — that route is patient-facing
 * and administrators are redirected away from it — so the dashboard needs its
 * own way to create an appointment.
 *
 * It posts to `POST /api/admin/appointments`, which runs the *same*
 * appointment service the public booking form uses: identical validation,
 * identical availability rules, and the same exclusion constraint guarding
 * against double booking. The time dropdown is built from live availability as
 * a convenience — the server is what decides.
 */
export function AppointmentCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();

  const empty = {
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    appointmentDate: todayISO(),
    startTime: '',
    reason: '',
    notes: '',
  };

  const [form, setForm] = useState(empty);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset each time the dialog opens, so a previous attempt never leaks in.
  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setFieldErrors({});
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadAvailability = useCallback(async (date: string) => {
    setLoadingSlots(true);
    try {
      setAvailability(await appointmentService.getAvailability(date));
    } catch {
      setAvailability(null);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !form.appointmentDate) return;
    void loadAvailability(form.appointmentDate);
  }, [open, form.appointmentDate, loadAvailability]);

  // Clear a chosen time that the newly loaded day does not actually offer.
  useEffect(() => {
    if (!availability) return;
    if (form.startTime && !availability.available.includes(form.startTime)) {
      setForm((current) => ({ ...current, startTime: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability]);

  const timeOptions = (() => {
    const free = availability?.available ?? [];
    if (loadingSlots) return [{ value: '', label: 'Loading times…' }];
    if (availability && !availability.isOpen) {
      return [{ value: '', label: `Closed on ${availability.dayName}s` }];
    }
    if (free.length === 0) return [{ value: '', label: 'No times available' }];
    return [
      { value: '', label: 'Choose a time…' },
      ...free.map((time) => ({ value: time, label: formatTime12h(time) })),
    ];
  })();

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    const nameError = validators.name(form.patientName);
    const emailError = validators.email(form.patientEmail);
    const phoneError = validators.phone(form.patientPhone);
    const reasonError = validators.reason(form.reason);

    if (nameError) errors.patientName = nameError;
    if (emailError) errors.patientEmail = emailError;
    if (phoneError) errors.patientPhone = phoneError;
    if (reasonError) errors.reason = reasonError;
    if (!form.startTime) errors.startTime = 'Please choose a time.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await adminService.createAppointment({
        patientName: form.patientName.trim(),
        patientEmail: form.patientEmail.trim(),
        patientPhone: form.patientPhone.trim(),
        appointmentDate: form.appointmentDate,
        startTime: form.startTime,
        reason: form.reason.trim(),
        notes: form.notes.trim() || null,
      });
      toast.success(
        'Appointment created',
        `${formatDateLong(form.appointmentDate)} at ${formatTime12h(form.startTime)}`,
      );
      onCreated();
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message);
        const serverErrors = requestError.fieldErrors;
        if (Object.keys(serverErrors).length > 0) setFieldErrors(serverErrors);
        // Somebody took the slot first — refresh so the dropdown tells the truth.
        if (requestError.isSlotConflict) void loadAvailability(form.appointmentDate);
      } else {
        setError('Could not create the appointment.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      dismissible={!saving}
      title="New appointment"
      description="Book on a patient's behalf. The same availability rules apply."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} loading={saving}>
            Create appointment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <InlineError message={error} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Patient name"
            required
            value={form.patientName}
            onChange={(event) => setForm({ ...form, patientName: event.target.value })}
            error={fieldErrors.patientName}
            leftIcon={<UserIcon className="h-4 w-4" />}
            placeholder="Jane Doe"
          />
          <Input
            label="Phone"
            required
            type="tel"
            value={form.patientPhone}
            onChange={(event) => setForm({ ...form, patientPhone: event.target.value })}
            error={fieldErrors.patientPhone}
            leftIcon={<Phone className="h-4 w-4" />}
            placeholder="+1 415 555 0123"
          />
        </div>

        <Input
          label="Email"
          required
          type="email"
          value={form.patientEmail}
          onChange={(event) => setForm({ ...form, patientEmail: event.target.value })}
          error={fieldErrors.patientEmail}
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="jane@example.com"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            required
            min={todayISO()}
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
            required
            value={form.startTime}
            onChange={(event) =>
              setForm({ ...form, startTime: (event.target as HTMLSelectElement).value })
            }
            options={timeOptions}
            error={fieldErrors.startTime}
          />
        </div>

        <Input
          label="Reason for visit"
          required
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
          error={fieldErrors.reason}
          placeholder="e.g. Check-up, toothache, cleaning"
        />

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          rows={3}
          placeholder="Anything the team should know…"
        />
      </div>
    </Modal>
  );
}
