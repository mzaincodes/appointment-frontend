'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/services';
import { cn, passwordStrength, validators } from '@/lib/utils';
import { sanitiseNext } from '@/lib/route-policy';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/Feedback';

/**
 * Registration page.
 *
 * Two details worth noting:
 *
 * - A live strength meter reports the same rules the server enforces, so the
 * requirements are visible while typing rather than announced on rejection.
 * - After signup the API reports how many guest bookings were linked to the
 * new account, and that is surfaced immediately — someone who booked as a
 * guest and then registered should be told their appointment came with them.
 */
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get('next');
  const strength = passwordStrength(form.password);

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: event.target.value });
    // Clear the field's error as soon as the user starts fixing it.
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    const nameError = validators.name(form.name);
    const emailError = validators.email(form.email);
    const passwordError = validators.password(form.password);
    const phoneError = validators.phone(form.phone, false);

    if (nameError) nextErrors.name = nameError;
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    if (phoneError) nextErrors.phone = phoneError;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      });

      if (result.claimedAppointments > 0) {
        toast.success(
          'Account created',
          `We also linked ${result.claimedAppointments} existing appointment${
            result.claimedAppointments === 1 ? '' : 's'
          } to your account.`,
        );
      } else {
        toast.success('Account created', `Welcome, ${result.user.name.split(' ')[0]}!`);
      }

      // Registration always creates a patient, so a `next` pointing at an
      // admin route is dropped rather than followed.
      router.push(sanitiseNext(nextPath, result.user.role) ?? '/');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        const fieldErrors = error.fieldErrors;
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      } else {
        setFormError('Could not create your account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Book faster, see your appointment history, and manage everything in one place."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href={`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`}
            className="font-medium text-brand-700 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && <InlineError message={formError} />}

        <Input
          label="Full name"
          required
          autoComplete="name"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          leftIcon={<UserIcon className="h-4 w-4" />}
          placeholder="Jane Doe"
        />

        <Input
          label="Email address"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="you@example.com"
        />

        <Input
          label="Phone number"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={update('phone')}
          error={errors.phone}
          leftIcon={<Phone className="h-4 w-4" />}
          placeholder="+1 415 555 0123"
          hint="Optional — but it saves typing it in every time you book."
        />

        <div>
          <Input
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            placeholder="At least 8 characters"
          />

          {form.password && !errors.password && (
            <div className="mt-2">
              <div className="flex gap-1" aria-hidden>
                {[1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-300',
                      strength.score >= level
                        ? strength.score <= 1
                          ? 'bg-red-500'
                          : strength.score === 2
                            ? 'bg-amber-500'
                            : strength.score === 3
                              ? 'bg-lime-500'
                              : 'bg-green-500'
                        : 'bg-line',
                    )}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-content-subtle">
                Password strength: <span className="font-medium">{strength.label}</span> — needs 8+
                characters with upper and lower case and a number.
              </p>
            </div>
          )}
        </div>

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Create account
        </Button>

        <p className="text-center text-xs leading-relaxed text-content-subtle">
          By creating an account you agree that we may contact you about your appointments.
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <RegisterForm />
    </Suspense>
  );
}
