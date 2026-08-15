'use client';

import Link from 'next/link';
import { CalendarPlus, CheckCircle2, Clock, Copy, MapPin, Phone, Plus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatDateLong, formatTime12h } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Appointment } from '@/types';

/**
 * Booking success state.
 *
 * Does more than say "done": it gives the reference, offers a calendar file,
 * and — for guests — points at registration so the booking is not something
 * they can only find in an email.
 */
export function BookingSuccess({
  appointment,
  onBookAnother,
}: {
  appointment: Appointment;
  onBookAnother: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const reference = appointment.id.slice(0, 8).toUpperCase();

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy', 'Please note the reference down manually.');
    }
  };

  /**
   * Builds an .ics file in the browser.
   *
   * A calendar entry is the single most useful thing to hand someone at this
   * moment, and generating it client-side avoids a round trip for what is
   * ultimately six lines of text.
   */
  const downloadCalendarFile = () => {
    const stamp = (date: string, time: string) =>
      `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bright Smile Dental Studio//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${appointment.id}@brightsmiledental.com`,
      `DTSTAMP:${stamp(appointment.appointmentDate, appointment.startTime)}`,
      `DTSTART:${stamp(appointment.appointmentDate, appointment.startTime)}`,
      `DTEND:${stamp(appointment.appointmentDate, appointment.endTime)}`,
      'SUMMARY:Dental appointment — Bright Smile Dental Studio',
      `DESCRIPTION:${appointment.reason.replace(/[\n,;]/g, '')}`,
      'LOCATION:218 Marina Boulevard Suite 300, San Francisco, CA 94123',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Dental appointment in 2 hours',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dental-appointment-${appointment.appointmentDate}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <div className="text-center">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full bg-success-fg/15 animate-pulse-ring"
            aria-hidden
          />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
            <CheckCircle2 className="h-8 w-8 text-success-fg" />
          </span>
        </div>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-content text-balance">
          You&rsquo;re booked in
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-content-muted text-pretty">
          We&rsquo;ve sent a confirmation to{' '}
          <strong className="text-content">{appointment.patientEmail}</strong>. Please arrive five
          minutes early.
        </p>
      </div>

      <Card variant="raised" padding="none" className="mt-8 overflow-hidden">
        <div className="bg-brand-gradient px-6 py-5 text-brand-on-solid">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
            Your appointment
          </p>
          <p className="mt-2 font-display text-2xl font-bold">
            {formatDateLong(appointment.appointmentDate)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm tabular opacity-90">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatTime12h(appointment.startTime)} – {formatTime12h(appointment.endTime)} · 30
            minutes
          </p>
        </div>

        <dl className="divide-y divide-line">
          <Row label="Patient">{appointment.patientName}</Row>
          <Row label="Reason">{appointment.reason}</Row>
          {appointment.serviceName && <Row label="Treatment">{appointment.serviceName}</Row>}
          {appointment.notes && <Row label="Notes">{appointment.notes}</Row>}
          <Row label="Reference">
            <button
              type="button"
              onClick={() => void copyReference()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-sunken px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-content transition-colors hover:bg-line"
            >
              {reference}
              <Copy className="h-3 w-3" aria-hidden />
              {copied && <span className="text-[10px] text-success-fg">Copied</span>}
            </button>
          </Row>
        </dl>

        <div className="flex flex-col gap-3 border-t border-line bg-surface-sunken/50 px-6 py-5 sm:flex-row">
          <Button
            variant="secondary"
            fullWidth
            onClick={downloadCalendarFile}
            leftIcon={<CalendarPlus className="h-4 w-4" />}
          >
            Add to calendar
          </Button>
          {isAuthenticated ? (
            <Link href="/appointments" className="w-full">
              <Button fullWidth>View my appointments</Button>
            </Link>
          ) : (
            <Link href="/register" className="w-full">
              <Button fullWidth>Create an account</Button>
            </Link>
          )}
        </div>
      </Card>

      {!isAuthenticated && (
        <div className="mt-4 rounded-xl border border-info-border bg-info-bg px-4 py-3 text-sm text-info-fg">
          Sign up with <strong>{appointment.patientEmail}</strong> and this appointment will appear
          in your account automatically — no need to re-enter anything.
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a
          href="tel:+14155550142"
          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong hover:bg-surface-sunken"
        >
          <Phone className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs text-content-subtle">Need to change something?</p>
            <p className="text-sm font-medium text-content">+1 (415) 555-0142</p>
          </div>
        </a>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <MapPin className="h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs text-content-subtle">Where to find us</p>
            <p className="text-sm font-medium text-content">218 Marina Blvd, Suite 300</p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Button variant="ghost" onClick={onBookAnother} leftIcon={<Plus className="h-4 w-4" />}>
          Book another appointment
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 px-6 py-3.5">
      <dt className="w-24 shrink-0 text-sm text-content-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm text-content">{children}</dd>
    </div>
  );
}
