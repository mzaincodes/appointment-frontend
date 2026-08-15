'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ApiError, appointmentService } from '@/services';
import { formatDateLong, formatTime12h } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/Feedback';
import { DatePicker } from '@/components/booking/DatePicker';
import { SlotPicker } from '@/components/booking/SlotPicker';
import type { Appointment, DayAvailability } from '@/types';

/**
 * Reschedule dialog.
 *
 * Reuses the same `DatePicker` and `SlotPicker` as the booking flow, so the
 * rules a patient sees when moving an appointment are identical to the ones
 * they saw when making it — there is no second copy to keep in step.
 *
 * The move is a single server-side update, not a cancel followed by a rebook,
 * so a patient can never end up having released their old slot without securing
 * the new one.
 */
export function RescheduleModal({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to the appointment's current date each time the dialog opens.
  useEffect(() => {
    if (!appointment) return;
    setDate(appointment.appointmentDate);
    setTime(null);
    setError(null);
  }, [appointment]);

  const loadAvailability = useCallback(async (targetDate: string) => {
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      setAvailability(await appointmentService.getAvailability(targetDate));
    } catch (requestError) {
      setSlotsError(
        requestError instanceof ApiError ? requestError.message : 'Could not load available times.',
      );
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!date || !appointment) return;
    void loadAvailability(date);
  }, [date, appointment, loadAvailability]);

  const handleSubmit = async () => {
    if (!appointment || !date || !time) return;

    setSubmitting(true);
    setError(null);
    try {
      await appointmentService.reschedule(appointment.id, {
        appointmentDate: date,
        startTime: time,
      });
      toast.success('Appointment moved', `${formatDateLong(date)} at ${formatTime12h(time)}`);
      onSuccess();
    } catch (requestError) {
      const message =
        requestError instanceof ApiError
          ? requestError.message
          : 'Could not move your appointment.';
      setError(message);

      // Someone took the slot first — refresh so the grid tells the truth.
      if (requestError instanceof ApiError && requestError.isSlotConflict) {
        void loadAvailability(date);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={appointment !== null}
      onClose={onClose}
      size="lg"
      dismissible={!submitting}
      title="Reschedule appointment"
      description={
        appointment
          ? `Currently ${formatDateLong(appointment.appointmentDate)} at ${formatTime12h(appointment.startTime)}`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep current time
          </Button>
          <Button onClick={() => void handleSubmit()} loading={submitting} disabled={!time}>
            {time ? `Move to ${formatTime12h(time)}` : 'Choose a new time'}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} className="mb-5" />}

      <DatePicker
        selected={date}
        onSelect={(nextDate) => {
          setDate(nextDate);
          setTime(null);
        }}
      />

      <div className="mt-6">
        <SlotPicker
          availability={availability}
          loading={loadingSlots}
          error={slotsError}
          selected={time}
          onSelect={setTime}
          onRetry={() => date && void loadAvailability(date)}
        />
      </div>
    </Modal>
  );
}
