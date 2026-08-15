'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/services';
import { validators } from '@/lib/utils';
import { homeFor, sanitiseNext } from '@/lib/route-policy';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { InlineError } from '@/components/ui/Feedback';

/**
 * Sign-in page.
 *
 * After a successful sign-in the user returns to wherever they were sent from
 * (`?next=`), so being asked to authenticate mid-task does not lose their
 * place. Admins with no explicit destination land on the dashboard.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get('next');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    const emailError = validators.email(email);
    if (emailError) nextErrors.email = emailError;
    if (!password) nextErrors.password = 'Password is required.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      // `next` is only honoured when the signed-in role may actually go
      // there. Without the check, a guest bounced from /admin who then signs
      // in as a patient would be delivered straight back to /admin.
      router.push(sanitiseNext(nextPath, user.role) ?? homeFor(user.role));
    } catch (error) {
      // The server returns one message for "no such account" and "wrong
      // password " alike; showing it verbatim keeps that property intact.
      setFormError(
        error instanceof ApiError ? error.message : 'Could not sign in. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your appointments and book faster next time."
      footer={
        <>
          Don&rsquo;t have an account?{' '}
          <Link
            href={`/register${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`}
            className="font-medium text-brand-700 hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && <InlineError message={formError} />}

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          placeholder="••••••••"
        />

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  //`useSearchParams` requires a Suspense boundary during static generation.
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <LoginForm />
    </Suspense>
  );
}
