'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  Info,
  Mail,
  Phone,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { ApiError, appointmentService } from '@/services';
import { cn, formatDateLong, formatTime12h, todayISO, validators } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/Feedback';
import { DatePicker } from './DatePicker';
import { SlotPicker } from './SlotPicker';
import { BookingSuccess } from './BookingSuccess';
import type { Appointment, DayAvailability, Service } from '@/types';

/**
 * Multi-step booking flow.
 *
 * date → time → your details → review → confirmed
 *
 * State lives in this component rather than a global store: it is scoped to one
 * booking, and lifting it further would only make it possible for a stale
 * selection to leak into a later session.
 *
 * The important behaviours:
 *
 * - Availability is re-fetched whenever the date changes and again just before
 * confirming, so a slot taken while the patient was typing is caught early.
 * - A 409 from the server (someone else booked first) is handled inline: the
 * alternatives it returns are rendered as one-tap buttons rather than an
 * error the patient has to recover from themselves.
 * - Signed-in patients skip re-entering details they already gave us.
 */

type Step = 'date' | 'time' | 'details' | 'review' | 'done';

const STEPS: Array<{ id: Step; label: string; icon: typeof CalendarDays }> = [
  { id: 'date', label: 'Date', icon: CalendarDays },
  { id: 'time', label: 'Time', icon: Clock },
  { id: 'details', label: 'Details', icon: UserIcon },
  { id: 'review', label: 'Review', icon: ClipboardList },
];

interface PatientDetails {
  name: string;
  email: string;
  phone: string;
  reason: string;
  notes: string;
  serviceId: string;
}

export function BookingFlow({ services }: { services: Service[] }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>('date');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [details, setDetails] = useState<PatientDetails>({
    name: '',
    email: '',
    phone: '',
    reason: '',
    notes: '',
    serviceId: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  /**
   * Prefill from the signed-in profile.
   *
   * Runs when auth resolves, and only fills blanks — a patient booking for a
   * family member can overwrite the name without it snapping back.
   */
  useEffect(() => {
    if (authLoading || !user) return;
    setDetails((current) => ({
      ...current,
      name: current.name || user.name,
      email: current.email || user.email,
      phone: current.phone || user.phone || '',
    }));
  }, [user, authLoading]);

  const loadAvailability = useCallback(async (targetDate: string) => {
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      setAvailability(await appointmentService.getAvailability(targetDate));
    } catch (error) {
      setSlotsError(error instanceof ApiError ? error.message : 'Could not load available times.');
      setAvailability(null);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!date) return;
    void loadAvailability(date);
  }, [date, loadAvailability]);

  const handleSelectDate = (nextDate: string) => {
    setDate(nextDate);
    // The previously chosen time may not exist on the new day.
    setTime(null);
    setAlternatives([]);
    setSubmitError(null);
    setStep('time');
  };

  const handleSelectTime = (nextTime: string) => {
    setTime(nextTime);
    setAlternatives([]);
    setSubmitError(null);
    setStep('details');
  };

  const validateDetails = (): boolean => {
    const errors: Record<string, string> = {};
    const nameError = validators.name(details.name);
    const emailError = validators.email(details.email);
    const phoneError = validators.phone(details.phone);
    const reasonError = validators.reason(details.reason);

    if (nameError) errors.patientName = nameError;
    if (emailError) errors.patientEmail = emailError;
    if (phoneError) errors.patientPhone = phoneError;
    if (reasonError) errors.reason = reasonError;

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDetailsSubmit = () => {
    if (!validateDetails()) return;
    setStep('review');
  };

  const handleConfirm = async () => {
    if (!date || !time) return;

    setSubmitting(true);
    setSubmitError(null);
    setAlternatives([]);

    try {
      const { appointment } = await appointmentService.create({
        patientName: details.name.trim(),
        patientEmail: details.email.trim(),
        patientPhone: details.phone.trim(),
        appointmentDate: date,
        startTime: time,
        serviceId: details.serviceId || null,
        reason: details.reason.trim(),
        notes: details.notes.trim() || null,
      });

      setConfirmed(appointment);
      setStep('done');
      toast.success('Appointment confirmed', `${formatDateLong(date)} at ${formatTime12h(time)}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);

        // Someone booked this slot first. Offer the alternatives the server
        // computed, and refresh the grid so it reflects reality.
        if (error.isSlotConflict) {
          setAlternatives(error.alternatives);
          void loadAvailability(date);
          toast.error('That time was just taken', 'Please choose one of the times we suggest.');
        } else if (Object.keys(error.fieldErrors).length > 0) {
          setFieldErrors(error.fieldErrors);
          setStep('details');
          toast.error('Please check your details');
        } else {
          toast.error('Booking failed', error.message);
        }
      } else {
        setSubmitError('Something went wrong. Please try again.');
        toast.error('Booking failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickAlternative = (nextTime: string) => {
    setTime(nextTime);
    setAlternatives([]);
    setSubmitError(null);
  };

  const resetFlow = () => {
    setStep('date');
    setDate(null);
    setTime(null);
    setConfirmed(null);
    setAvailability(null);
    setSubmitError(null);
    setAlternatives([]);
    setDetails((current) => ({
      ...current,
      reason: '',
      notes: '',
      serviceId: '',
    }));
  };

  const currentStepIndex = useMemo(() => STEPS.findIndex((entry) => entry.id === step), [step]);

  if (step === 'done' && confirmed) {
    return <BookingSuccess appointment={confirmed} onBookAnother={resetFlow} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <StepIndicator currentIndex={currentStepIndex} />

      <Card variant="default" padding="lg" className="mt-6">
        {/* ---- Step 1: date ------------------------------------------------ */}
        {step === 'date' && (
          <div className="animate-fade-up">
            <StepHeader
              title="When would you like to come in?"
              description="Pick a date and we'll show you the times still free. We're open Monday to Saturday, 9:00 AM to 5:00 PM."
            />
            <div className="mt-6">
              <DatePicker selected={date} onSelect={handleSelectDate} />
            </div>
          </div>
        )}

        {/* ---- Step 2: time ------------------------------------------------ */}
        {step === 'time' && date && (
          <div className="animate-fade-up">
            <StepHeader
              title="Choose a time"
              description={`Available 30-minute appointments on ${formatDateLong(date)}.`}
            />
            <div className="mt-5">
              <DatePicker selected={date} onSelect={handleSelectDate} />
            </div>
            <div className="mt-7">
              <SlotPicker
                availability={availability}
                loading={loadingSlots}
                error={slotsError}
                selected={time}
                onSelect={handleSelectTime}
                onRetry={() => void loadAvailability(date)}
              />
            </div>
            <StepFooter onBack={() => setStep('date')} />
          </div>
        )}

        {/* ---- Step 3: details --------------------------------------------- */}
        {step === 'details' && date && time && (
          <div className="animate-fade-up">
            <StepHeader
              title="Your details"
              description={
                isAuthenticated
                  ? "We've filled these in from your account — edit anything that needs changing."
                  : 'We need these to confirm your appointment and send you a reminder.'
              }
            />

            <SelectionSummary date={date} time={time} onChange={() => setStep('time')} />

            {isAuthenticated && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-info-border bg-info-bg px-4 py-3 text-sm text-info-fg">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Signed in as <strong>{user?.name}</strong> — this appointment will appear in your
                  account.
                </span>
              </div>
            )}

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleDetailsSubmit();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  required
                  value={details.name}
                  onChange={(event) => setDetails({ ...details, name: event.target.value })}
                  error={fieldErrors.patientName}
                  leftIcon={<UserIcon className="h-4 w-4" />}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
                <Input
                  label="Phone number"
                  required
                  type="tel"
                  value={details.phone}
                  onChange={(event) => setDetails({ ...details, phone: event.target.value })}
                  error={fieldErrors.patientPhone}
                  leftIcon={<Phone className="h-4 w-4" />}
                  placeholder="+1 415 555 0123"
                  autoComplete="tel"
                />
              </div>

              <Input
                label="Email address"
                required
                type="email"
                value={details.email}
                onChange={(event) => setDetails({ ...details, email: event.target.value })}
                error={fieldErrors.patientEmail}
                leftIcon={<Mail className="h-4 w-4" />}
                placeholder="jane@example.com"
                autoComplete="email"
                hint="We'll send your confirmation here."
              />

              {services.length > 0 && (
                <Select
                  label="Treatment (optional)"
                  value={details.serviceId}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      serviceId: (event.target as HTMLSelectElement).value,
                    })
                  }
                  options={[
                    {
                      value: '',
                      label: "Not sure yet — I'll discuss it at the visit",
                    },
                    ...services.map((service) => ({
                      value: service.id,
                      label: service.name,
                    })),
                  ]}
                />
              )}

              <Input
                label="Reason for your visit"
                required
                value={details.reason}
                onChange={(event) => setDetails({ ...details, reason: event.target.value })}
                error={fieldErrors.reason}
                placeholder="e.g. Six-month check-up, toothache, teeth cleaning"
              />

              <Textarea
                label="Anything else we should know? (optional)"
                value={details.notes}
                onChange={(event) => setDetails({ ...details, notes: event.target.value })}
                placeholder="Dental anxiety, medication, allergies, accessibility needs…"
                rows={3}
                hint="Tell us about nerves or medical needs and we'll prepare for them."
              />

              {!isAuthenticated && (
                <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm text-content-muted">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-content-subtle" aria-hidden />
                  <span>
                    You can book without an account.{' '}
                    <Link href="/register" className="font-medium text-brand-700 underline">
                      Creating one
                    </Link>{' '}
                    lets you view and cancel your appointments later — and we&apos;ll link this
                    booking to it automatically if you sign up with the same email.
                  </span>
                </div>
              )}

              <StepFooter
                onBack={() => setStep('time')}
                submitLabel="Review booking"
                onSubmit={handleDetailsSubmit}
              />
            </form>
          </div>
        )}

        {/* ---- Step 4: review ---------------------------------------------- */}
        {step === 'review' && date && time && (
          <div className="animate-fade-up">
            <StepHeader
              title="Check everything over"
              description="One last look before we reserve your slot."
            />

            <div className="mt-6 overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-4 bg-brand-500/8 px-5 py-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-brand-on-solid">
                  <CalendarCheck2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-base font-bold text-content">
                    {formatDateLong(date)}
                  </p>
                  <p className="text-sm tabular text-content-muted">
                    {formatTime12h(time)} – {formatTime12h(addThirtyMinutes(time))} · 30 minutes
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-line">
                <ReviewRow label="Name" value={details.name} />
                <ReviewRow label="Email" value={details.email} />
                <ReviewRow label="Phone" value={details.phone} />
                {details.serviceId && (
                  <ReviewRow
                    label="Treatment"
                    value={
                      services.find((service) => service.id === details.serviceId)?.name ?? '—'
                    }
                  />
                )}
                <ReviewRow label="Reason" value={details.reason} />
                {details.notes && <ReviewRow label="Notes" value={details.notes} />}
              </dl>
            </div>

            {submitError && (
              <div className="mt-5 space-y-3">
                <InlineError message={submitError} />

                {/* Recovery path for a lost race — one tap to a free time. */}
                {alternatives.length > 0 && (
                  <div className="rounded-xl border border-line bg-surface-sunken p-4">
                    <p className="text-sm font-medium text-content">
                      These times are still available:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {alternatives.map((alternative) => (
                        <button
                          key={alternative}
                          type="button"
                          onClick={() => handlePickAlternative(alternative)}
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold tabular text-content transition-all hover:border-brand-500 hover:bg-brand-500/10 active:scale-95"
                        >
                          {formatTime12h(alternative)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-surface-sunken px-4 py-3 text-xs text-content-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                Free cancellation up to 24 hours before your appointment. Please arrive five minutes
                early.
              </span>
            </div>

            <StepFooter
              onBack={() => setStep('details')}
              submitLabel="Confirm appointment"
              onSubmit={() => void handleConfirm()}
              loading={submitting}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational pieces
// ---------------------------------------------------------------------------

function StepIndicator({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="flex items-center justify-between gap-1" aria-label="Booking progress">
      {STEPS.map((entry, index) => {
        const Icon = entry.icon;
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li key={entry.id} className="flex flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300',
                  isDone
                    ? 'border-brand-600 bg-brand-solid text-brand-on-solid dark:border-brand-500'
                    : isCurrent
                      ? 'border-brand-500 bg-brand-500/12 text-brand-700 shadow-glow'
                      : 'border-line bg-surface text-content-subtle',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isCurrent ? 'text-content' : 'text-content-subtle',
                )}
              >
                {entry.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <span
                className={cn(
                  'mb-5 h-0.5 flex-1 rounded-full transition-colors duration-300',
                  isDone ? 'bg-brand-500' : 'bg-line',
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold tracking-tight text-content sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-content-muted text-pretty">{description}</p>
    </div>
  );
}

function StepFooter({
  onBack,
  onSubmit,
  submitLabel,
  loading,
}: {
  onBack: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-2.5 border-t border-line pt-5 sm:flex-row sm:justify-between">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={loading}
        leftIcon={<ArrowLeft className="h-4 w-4" />}
      >
        Back
      </Button>
      {onSubmit && submitLabel && (
        <Button
          type="submit"
          onClick={onSubmit}
          loading={loading}
          rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  );
}

function SelectionSummary({
  date,
  time,
  onChange,
}: {
  date: string;
  time: string;
  onChange: () => void;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-brand-500/30 bg-brand-500/8 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <CalendarCheck2 className="h-4.5 w-4.5 shrink-0 text-brand-text" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-content">{formatDateLong(date)}</p>
          <p className="text-xs tabular text-content-muted">{formatTime12h(time)} · 30 minutes</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onChange} className="shrink-0">
        Change
      </Button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-5 py-3">
      <dt className="w-24 shrink-0 text-sm text-content-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm text-content">{value}</dd>
    </div>
  );
}

/** Display-only end time; the server computes the value that is stored. */
function addThirtyMinutes(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const total = (hours ?? 0) * 60 + (minutes ?? 0) + 30;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
